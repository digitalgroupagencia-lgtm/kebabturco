-- Modo visita: impressão demo no Mac do admin master + cupão DEMO-IMPRESSAO

ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS is_visit_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visit_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_print_jobs_visit_demo
  ON public.print_jobs (visit_owner_id, status)
  WHERE is_visit_demo = true;

CREATE TABLE IF NOT EXISTS public.master_visit_print_config (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  printer_ip text NOT NULL DEFAULT '',
  printer_port integer NOT NULL DEFAULT 9100,
  target_store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  bridge_last_seen_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_visit_print_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master own visit print config" ON public.master_visit_print_config;
CREATE POLICY "Admin master own visit print config"
  ON public.master_visit_print_config
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin_master'::public.app_role));

CREATE OR REPLACE FUNCTION public.save_master_visit_print_config(
  _printer_ip text,
  _printer_port integer DEFAULT 9100,
  _target_store_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.master_visit_print_config (user_id, printer_ip, printer_port, target_store_id, updated_at)
  VALUES (auth.uid(), trim(COALESCE(_printer_ip, '')), COALESCE(_printer_port, 9100), _target_store_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    printer_ip = EXCLUDED.printer_ip,
    printer_port = EXCLUDED.printer_port,
    target_store_id = EXCLUDED.target_store_id,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_master_visit_print_config()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.master_visit_print_config%ROWTYPE;
  v_store_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_row FROM public.master_visit_print_config WHERE user_id = auth.uid();

  IF v_row.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', auth.uid(),
      'printer_ip', '',
      'printer_port', 9100,
      'target_store_id', null,
      'bridge_last_seen_at', null
    );
  END IF;

  IF v_row.target_store_id IS NOT NULL THEN
    SELECT name INTO v_store_name FROM public.stores WHERE id = v_row.target_store_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_row.user_id,
    'printer_ip', v_row.printer_ip,
    'printer_port', v_row.printer_port,
    'target_store_id', v_row.target_store_id,
    'target_store_name', v_store_name,
    'bridge_last_seen_at', v_row.bridge_last_seen_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_visit_print_bridge_heartbeat(_owner_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.master_visit_print_config
  SET bridge_last_seen_at = now(), updated_at = now()
  WHERE user_id = _owner_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_visit_demo_print(
  _ticket_data text,
  _store_id uuid,
  _order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.master_visit_print_config%ROWTYPE;
  v_job_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_cfg FROM public.master_visit_print_config WHERE user_id = auth.uid();
  IF v_cfg.user_id IS NULL OR NULLIF(trim(v_cfg.printer_ip), '') IS NULL THEN
    RAISE EXCEPTION 'Configure a impressora de visita no painel admin';
  END IF;

  INSERT INTO public.print_jobs (
    store_id, order_id, printer_ip, printer_port, ticket_data, copies, status,
    is_visit_demo, visit_owner_id
  ) VALUES (
    _store_id,
    _order_id,
    trim(v_cfg.printer_ip),
    COALESCE(v_cfg.printer_port, 9100),
    _ticket_data,
    1,
    'pending',
    true,
    auth.uid()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_visit_print_jobs(_owner_user_id uuid, _limit integer DEFAULT 5)
RETURNS SETOF public.print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.print_jobs pj
  SET status = 'printing', updated_at = now(), error_message = null
  WHERE pj.id IN (
    SELECT id FROM public.print_jobs
    WHERE is_visit_demo = true
      AND visit_owner_id = _owner_user_id
      AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT GREATEST(_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING pj.*;
END;
$$;

-- Cupão sistema DEMO-IMPRESSAO (só admin master com impressora de visita configurada)
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _store_id uuid,
  _code text,
  _subtotal numeric,
  _delivery_fee numeric DEFAULT 0,
  _cart_items jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric := 0;
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_unit numeric;
  v_total_qty integer := 0;
  v_min_items integer;
  v_nth_pct numeric;
  v_cheapest_unit numeric;
BEGIN
  IF upper(trim(COALESCE(_code, ''))) = 'DEMO-IMPRESSAO' THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Cupón reservado para demostración (admin master)');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.master_visit_print_config m
      WHERE m.user_id = auth.uid() AND NULLIF(trim(m.printer_ip), '') IS NOT NULL
    ) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Configure la impresora de visita en Admin → Demo visita');
    END IF;
    v_discount := round(COALESCE(_subtotal, 0) + COALESCE(_delivery_fee, 0), 2);
    RETURN jsonb_build_object(
      'valid', true,
      'coupon_id', null,
      'code', 'DEMO-IMPRESSAO',
      'discount_amount', v_discount,
      'discount_type', 'demo_visit',
      'demo_visit', true,
      'free_delivery', false
    );
  END IF;

  SELECT * INTO v_coupon FROM public.coupons
  WHERE store_id = _store_id
    AND upper(trim(code)) = upper(trim(_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón no válido');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón expirado');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón agotado');
  END IF;

  IF _subtotal < v_coupon.min_order THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Pedido mínimo no alcanzado');
  END IF;

  IF v_coupon.discount_type = 'free_delivery' THEN
    IF COALESCE(_delivery_fee, 0) <= 0 THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Cupón válido só para entregas');
    END IF;
    v_discount := round(_delivery_fee, 2);
    RETURN jsonb_build_object(
      'valid', true,
      'coupon_id', v_coupon.id,
      'code', v_coupon.code,
      'discount_amount', v_discount,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'free_delivery', true
    );
  END IF;

  IF v_coupon.discount_type = 'combo_nth' THEN
    v_pid := COALESCE(v_coupon.linked_product_id, (v_coupon.promo_config->>'product_id')::uuid);
    v_min_items := COALESCE((v_coupon.promo_config->>'min_items')::integer, 3);
    v_nth_pct := COALESCE((v_coupon.promo_config->>'nth_discount_percent')::numeric, 50);

    IF v_pid IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Cupón mal configurado');
    END IF;

    v_cheapest_unit := NULL;
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_cart_items, '[]'::jsonb))
    LOOP
      IF (v_item->>'product_id')::uuid = v_pid THEN
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::integer, 1), 1);
        v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
        v_total_qty := v_total_qty + v_qty;
        IF v_cheapest_unit IS NULL OR v_unit < v_cheapest_unit THEN
          v_cheapest_unit := v_unit;
        END IF;
      END IF;
    END LOOP;

    IF v_total_qty < v_min_items THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', format('Adicione pelo menos %s unidades do produto em promoção', v_min_items)
      );
    END IF;

    v_discount := round(COALESCE(v_cheapest_unit, 0) * (v_nth_pct / 100), 2);
    RETURN jsonb_build_object(
      'valid', true,
      'coupon_id', v_coupon.id,
      'code', v_coupon.code,
      'discount_amount', v_discount,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_nth_pct,
      'combo_applied', true
    );
  END IF;

  IF v_coupon.discount_type = 'percent' THEN
    v_discount := round(_subtotal * (v_coupon.discount_value / 100), 2);
  ELSE
    v_discount := least(v_coupon.discount_value, _subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_discount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'free_delivery', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_master_visit_print_config(text, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_master_visit_print_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_visit_demo_print(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_visit_print_bridge_heartbeat(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_visit_print_jobs(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_demo_visit_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF upper(trim(COALESCE(v_order.coupon_code, ''))) <> 'DEMO-IMPRESSAO' THEN
    RAISE EXCEPTION 'Pedido não é demonstração';
  END IF;

  UPDATE public.orders
  SET
    is_test = true,
    payment_status = 'paid'::public.payment_status,
    total = 0,
    status = 'pending'::public.order_status,
    notes = trim(COALESCE(v_order.notes, '') || ' [DEMO VISITA — não aparece no painel da loja]'),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'demo_visit', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_demo_visit_order(uuid) TO authenticated;
