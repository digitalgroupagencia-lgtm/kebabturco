-- Estabilização operacional: impressão única, caixa, QR mesa

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS kitchen_printed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_kitchen_print ON public.orders (store_id, kitchen_printed_at);

-- Reserva impressão de cozinha — retorna true só na primeira vez.
CREATE OR REPLACE FUNCTION public.claim_kitchen_print(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean := false;
BEGIN
  UPDATE public.orders
  SET kitchen_printed_at = now(), updated_at = now()
  WHERE id = _order_id AND kitchen_printed_at IS NULL
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_kitchen_print(uuid) TO anon, authenticated, service_role;

/** Operador marca pedido como pago no balcão. */
CREATE OR REPLACE FUNCTION public.mark_order_paid_at_counter(
  _order_id uuid,
  _payment_method text DEFAULT 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_pm public.payment_method;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR v_order.store_id IN (
      SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', v_order.id);
  END IF;

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method
    ELSE 'cash'::public.payment_method
  END;

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, v_pm),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'order_number', v_order.order_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid_at_counter(uuid, text) TO authenticated;

-- Invalida QR antigo e gera token novo.
CREATE OR REPLACE FUNCTION public.regenerate_table_qr_token(_table_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tables t
    JOIN public.stores s ON s.id = t.store_id
    WHERE t.id = _table_id
      AND (
        public.has_role(auth.uid(), 'admin_master'::app_role)
        OR s.tenant_id = public.get_user_tenant_id(auth.uid())
      )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_token := gen_random_uuid()::text;
  UPDATE public.tables SET qr_token = v_token, updated_at = now() WHERE id = _table_id;
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_table_qr_token(uuid) TO authenticated;
