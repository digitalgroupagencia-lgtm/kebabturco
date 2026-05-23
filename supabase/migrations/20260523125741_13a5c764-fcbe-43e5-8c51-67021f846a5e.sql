ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_street text,
  ADD COLUMN IF NOT EXISTS delivery_number text,
  ADD COLUMN IF NOT EXISTS delivery_complement text,
  ADD COLUMN IF NOT EXISTS delivery_postal_code text,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_notes text,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_zone_name text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz;

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, phone)
);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_id_fkey,
  ADD CONSTRAINT orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone text,
  discount_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  stamps integer NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  rewards_redeemed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, phone)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone text,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  campaign_type text NOT NULL CHECK (campaign_type IN ('winback', 'abandoned_cart', 'loyalty_reward', 'promo')),
  message_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  trigger_days integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Tenant manage coupons" ON public.coupons;
CREATE POLICY "Tenant manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Anon insert push subs" ON public.push_subscriptions;
CREATE POLICY "Anon insert push subs" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Read own push subs" ON public.push_subscriptions;
CREATE POLICY "Read own push subs" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Tenant manage loyalty" ON public.loyalty_accounts;
CREATE POLICY "Tenant manage loyalty" ON public.loyalty_accounts FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant manage campaigns" ON public.marketing_campaigns;
CREATE POLICY "Tenant manage campaigns" ON public.marketing_campaigns FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Anon upsert customers via RPC only" ON public.customers;
CREATE POLICY "Anon upsert customers via RPC only" ON public.customers FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _store_id uuid, _code text, _subtotal numeric
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coupon public.coupons%ROWTYPE; v_discount numeric;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons
  WHERE store_id = _store_id AND upper(trim(code)) = upper(trim(_code)) AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupón no válido'); END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón expirado'); END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón agotado'); END IF;
  IF _subtotal < v_coupon.min_order THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Pedido mínimo no alcanzado'); END IF;
  IF v_coupon.discount_type = 'percent' THEN
    v_discount := round(_subtotal * (v_coupon.discount_value / 100), 2);
  ELSE v_discount := least(v_coupon.discount_value, _subtotal); END IF;
  RETURN jsonb_build_object('valid', true, 'coupon_id', v_coupon.id, 'code', v_coupon.code,
    'discount_amount', v_discount, 'discount_type', v_coupon.discount_type, 'discount_value', v_coupon.discount_value);
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_coupon TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_orders(_store_id uuid, _phone text)
RETURNS TABLE (id uuid, order_number text, status text, total numeric, order_type text, created_at timestamptz, items jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.order_number, o.status::text, o.total, o.order_type, o.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('product_name', oi.product_name, 'quantity', oi.quantity,
      'unit_price', oi.unit_price, 'extras', oi.extras, 'removed', oi.removed, 'notes', oi.notes))
      FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  FROM public.orders o WHERE o.store_id = _store_id AND o.customer_phone = trim(_phone)
  ORDER BY o.created_at DESC LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.get_customer_orders TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_loyalty_stamp(_store_id uuid, _phone text, _customer_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_acc public.loyalty_accounts%ROWTYPE; v_stamps_needed constant integer := 10;
BEGIN
  IF trim(_phone) = '' THEN RETURN jsonb_build_object('stamps', 0, 'reward_ready', false); END IF;
  INSERT INTO public.loyalty_accounts (store_id, phone, customer_id, stamps, total_orders)
  VALUES (_store_id, trim(_phone), _customer_id, 1, 1)
  ON CONFLICT (store_id, phone) DO UPDATE SET
    stamps = public.loyalty_accounts.stamps + 1,
    total_orders = public.loyalty_accounts.total_orders + 1,
    customer_id = COALESCE(EXCLUDED.customer_id, public.loyalty_accounts.customer_id),
    updated_at = now()
  RETURNING * INTO v_acc;
  RETURN jsonb_build_object('stamps', v_acc.stamps, 'stamps_needed', v_stamps_needed,
    'reward_ready', v_acc.stamps >= v_stamps_needed, 'total_orders', v_acc.total_orders);
END; $$;
GRANT EXECUTE ON FUNCTION public.add_loyalty_stamp TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_loyalty_status(_store_id uuid, _phone text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('stamps', COALESCE(la.stamps, 0), 'stamps_needed', 10,
    'total_orders', COALESCE(la.total_orders, 0), 'reward_ready', COALESCE(la.stamps, 0) >= 10)
  FROM (SELECT 1) x LEFT JOIN public.loyalty_accounts la ON la.store_id = _store_id AND la.phone = trim(_phone);
$$;
GRANT EXECUTE ON FUNCTION public.get_loyalty_status TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_order_public(uuid);
CREATE OR REPLACE FUNCTION public.get_order_public(_order_id uuid)
RETURNS TABLE(id uuid, order_number text, status text, payment_status text, total numeric, order_type text,
  created_at timestamptz, delivery_street text, delivery_number text, delivery_city text,
  delivery_postal_code text, delivery_fee numeric, estimated_ready_at timestamptz, discount_amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, order_number, status::text, payment_status::text, total, order_type, created_at,
    delivery_street, delivery_number, delivery_city, delivery_postal_code, delivery_fee,
    estimated_ready_at, discount_amount
  FROM public.orders WHERE id = _order_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.create_customer_order(uuid, text, jsonb, numeric, numeric, text, uuid, text, text, text, text, text, text, integer);
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
  v_zone_min numeric; v_zone_fee numeric; v_sub numeric; v_prep_min integer; v_loyalty jsonb;
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
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, total_price,
      size_name, extras, removed, notes) VALUES (v_order, NULLIF(v_item->>'product_id', '')::uuid,
      COALESCE(v_item->>'product_name', 'Item'), v_qty, v_unit, v_line, v_item->>'size_name',
      COALESCE(v_item->'extras', '[]'::jsonb), COALESCE(v_item->'removed', '[]'::jsonb), v_item->>'notes');
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