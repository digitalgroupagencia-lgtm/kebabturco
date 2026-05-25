-- Sistema global de modificadores / personalização (white-label)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS combo_unit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_label jsonb DEFAULT '{"es":"Unidad","pt":"Unidade","en":"Unit","fr":"Unité"}'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS configuration jsonb;

COMMENT ON COLUMN public.products.product_type IS 'simple | combo';
COMMENT ON COLUMN public.products.combo_unit_count IS 'Nº unidades configuráveis (ex.: 4 pitas num combo)';
COMMENT ON COLUMN public.order_items.selections IS 'Snapshot estruturado das escolhas do cliente';

CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name jsonb NOT NULL DEFAULT '{}'::jsonb,
  description jsonb DEFAULT '{}'::jsonb,
  group_kind text NOT NULL DEFAULT 'choice'
    CHECK (group_kind IN ('choice', 'removal', 'extra')),
  selection_mode text NOT NULL DEFAULT 'single'
    CHECK (selection_mode IN ('single', 'multiple')),
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  max_qty integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  repeat_per_unit boolean NOT NULL DEFAULT false,
  UNIQUE (product_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_store ON public.modifier_groups(store_id);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON public.modifier_options(group_id);
CREATE INDEX IF NOT EXISTS idx_product_modifier_groups_product ON public.product_modifier_groups(product_id);

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifier_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant manage modifier groups" ON public.modifier_groups;
CREATE POLICY "Tenant manage modifier groups" ON public.modifier_groups
  FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read active modifier groups" ON public.modifier_groups;
CREATE POLICY "Public read active modifier groups" ON public.modifier_groups
  FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = true)
  );

DROP POLICY IF EXISTS "Tenant manage modifier options" ON public.modifier_options;
CREATE POLICY "Tenant manage modifier options" ON public.modifier_options
  FOR ALL TO authenticated
  USING (
    group_id IN (
      SELECT mg.id FROM public.modifier_groups mg
      WHERE mg.store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT mg.id FROM public.modifier_groups mg
      WHERE mg.store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Public read active modifier options" ON public.modifier_options;
CREATE POLICY "Public read active modifier options" ON public.modifier_options
  FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      JOIN public.stores s ON s.id = mg.store_id
      WHERE mg.id = group_id AND mg.is_active = true AND s.is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenant manage product modifier groups" ON public.product_modifier_groups;
CREATE POLICY "Tenant manage product modifier groups" ON public.product_modifier_groups
  FOR ALL TO authenticated
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      WHERE p.store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id FROM public.products p
      WHERE p.store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Public read product modifier groups" ON public.product_modifier_groups;
CREATE POLICY "Public read product modifier groups" ON public.product_modifier_groups
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_id AND p.is_active = true AND s.is_active = true
    )
  );

CREATE TRIGGER update_modifier_groups_updated_at
  BEFORE UPDATE ON public.modifier_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modifier_options_updated_at
  BEFORE UPDATE ON public.modifier_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- create_customer_order: persistir selections
CREATE OR REPLACE FUNCTION public.create_customer_order(
  _store_id uuid, _order_type text, _items jsonb, _total numeric,
  _subtotal numeric DEFAULT NULL, _table_number text DEFAULT NULL, _table_id uuid DEFAULT NULL,
  _customer_name text DEFAULT NULL, _customer_phone text DEFAULT NULL, _notes text DEFAULT NULL,
  _payment_method text DEFAULT NULL, _payment_status text DEFAULT 'pending',
  _stripe_payment_intent_id text DEFAULT NULL, _application_fee_cents integer DEFAULT 0,
  _delivery_street text DEFAULT NULL, _delivery_number text DEFAULT NULL, _delivery_complement text DEFAULT NULL,
  _delivery_postal_code text DEFAULT NULL, _delivery_city text DEFAULT NULL, _delivery_notes text DEFAULT NULL,
  _delivery_fee numeric DEFAULT 0, _delivery_zone_id uuid DEFAULT NULL, _delivery_zone_name text DEFAULT NULL,
  _coupon_code text DEFAULT NULL, _discount_amount numeric DEFAULT 0, _coupon_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session uuid; v_customer uuid; v_customer_profile uuid; v_order uuid; v_order_number text;
  v_item jsonb; v_qty int; v_unit numeric; v_line numeric;
  v_pm public.payment_method; v_ps public.payment_status;
  v_zone_min numeric; v_zone_fee numeric; v_sub numeric; v_loyalty jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Loja inválida'; END IF;
  v_sub := COALESCE(_subtotal, _total);
  IF _order_type = 'delivery' THEN
    IF NULLIF(trim(_delivery_street), '') IS NULL OR NULLIF(trim(_delivery_number), '') IS NULL
       OR NULLIF(trim(_delivery_postal_code), '') IS NULL OR NULLIF(trim(_delivery_city), '') IS NULL THEN
      RAISE EXCEPTION 'Morada de entrega incompleta'; END IF;
    IF NULLIF(trim(_customer_phone), '') IS NULL THEN
      RAISE EXCEPTION 'Telefone obrigatório para delivery'; END IF;
    IF _delivery_zone_id IS NOT NULL THEN
      SELECT min_order, delivery_fee INTO v_zone_min, v_zone_fee FROM public.delivery_zones
      WHERE id = _delivery_zone_id AND store_id = _store_id AND is_active = true;
      IF NOT FOUND THEN RAISE EXCEPTION 'Zona de entrega inválida'; END IF;
      IF v_sub < COALESCE(v_zone_min, 0) THEN
        RAISE EXCEPTION 'Pedido abaixo do mínimo da zona (%.2f €)', v_zone_min; END IF;
    END IF;
  END IF;
  IF _coupon_id IS NOT NULL AND COALESCE(_discount_amount, 0) > 0 THEN
    PERFORM 1 FROM public.coupons WHERE id = _coupon_id AND store_id = _store_id AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cupón inválido'; END IF;
  END IF;
  v_order_number := public.next_order_number(_store_id);
  IF _order_type = 'dine_in' AND _table_number IS NOT NULL THEN
    v_session := public.open_or_get_table_session_public(_store_id, _table_number, _table_id);
    v_customer := public.add_or_get_table_customer_public(v_session, COALESCE(_customer_name, 'Cliente'));
  END IF;
  IF NULLIF(trim(_customer_phone), '') IS NOT NULL THEN
    INSERT INTO public.customers (store_id, phone, name)
    VALUES (_store_id, trim(_customer_phone), NULLIF(trim(_customer_name), ''))
    ON CONFLICT (store_id, phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, public.customers.name), updated_at = now()
    RETURNING id INTO v_customer_profile;
  END IF;
  SELECT avg_prep_minutes INTO v_prep_min FROM public.operations_settings WHERE store_id = _store_id LIMIT 1;
  v_ps := CASE WHEN auth.role() = 'anon' THEN 'pending'::public.payment_status
    ELSE COALESCE(_payment_status::public.payment_status, 'pending'::public.payment_status) END;
  IF auth.role() = 'authenticated' AND _payment_status IS NOT NULL THEN
    v_ps := _payment_status::public.payment_status; END IF;
  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
    WHEN 'google_pay' THEN 'google_pay'::public.payment_method ELSE NULL END;
  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, customer_phone, customer_id, table_number, table_session_id, table_customer_id,
    subtotal, total, notes, payment_method, payment_status, stripe_payment_intent_id, application_fee_cents,
    delivery_street, delivery_number, delivery_complement, delivery_postal_code, delivery_city, delivery_notes,
    delivery_fee, delivery_zone_id, delivery_zone_name, discount_amount, coupon_code, estimated_ready_at
  ) VALUES (
    _store_id, v_order_number, 'totem'::order_source, 'pending'::order_status, _order_type,
    NULLIF(trim(_customer_name), ''), NULLIF(trim(_customer_phone), ''), v_customer_profile, _table_number,
    v_session, v_customer, v_sub, _total, _notes, v_pm, v_ps, _stripe_payment_intent_id, COALESCE(_application_fee_cents, 0),
    NULLIF(trim(_delivery_street), ''), NULLIF(trim(_delivery_number), ''), NULLIF(trim(_delivery_complement), ''),
    NULLIF(trim(_delivery_postal_code), ''), NULLIF(trim(_delivery_city), ''), NULLIF(trim(_delivery_notes), ''),
    COALESCE(_delivery_fee, 0), _delivery_zone_id, _delivery_zone_name,
    COALESCE(_discount_amount, 0), NULLIF(trim(_coupon_code), ''),
    CASE WHEN v_prep_min IS NOT NULL THEN now() + (v_prep_min || ' minutes')::interval ELSE NULL END
  ) RETURNING id INTO v_order;
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line := COALESCE((v_item->>'total_price')::numeric, v_qty * v_unit);
    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      size_name, extras, removed, notes, selections, configuration
    ) VALUES (
      v_order, NULLIF(v_item->>'product_id', '')::uuid,
      COALESCE(v_item->>'product_name', 'Item'), v_qty, v_unit, v_line, v_item->>'size_name',
      COALESCE(v_item->'extras', '[]'::jsonb), COALESCE(v_item->'removed', '[]'::jsonb), v_item->>'notes',
      COALESCE(v_item->'selections', '[]'::jsonb),
      v_item->'configuration'
    );
  END LOOP;
  IF _coupon_id IS NOT NULL AND COALESCE(_discount_amount, 0) > 0 THEN
    INSERT INTO public.coupon_redemptions (coupon_id, order_id, customer_phone, discount_amount)
    VALUES (_coupon_id, v_order, NULLIF(trim(_customer_phone), ''), _discount_amount);
    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = _coupon_id;
  END IF;
  IF v_session IS NOT NULL AND v_customer IS NOT NULL THEN
    UPDATE public.table_session_customers SET total_amount = total_amount + _total, updated_at = now() WHERE id = v_customer;
    UPDATE public.table_sessions SET total_amount = total_amount + _total, updated_at = now() WHERE id = v_session;
  END IF;
  IF NULLIF(trim(_customer_phone), '') IS NOT NULL THEN
    v_loyalty := public.add_loyalty_stamp(_store_id, _customer_phone, v_customer_profile);
  END IF;
  RETURN jsonb_build_object('success', true, 'order_id', v_order, 'order_number', v_order_number,
    'session_id', v_session, 'customer_id', v_customer, 'loyalty', v_loyalty);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_customer_order TO anon, authenticated;
