-- Modo Mesa: pagamentos Stripe, pedidos de cliente anónimo, sessões de mesa públicas

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS application_fee_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON public.orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON public.orders(store_id, table_number, created_at);

-- Leitura pública de mesas activas (validação QR ?mesa=)
DROP POLICY IF EXISTS "Public read active tables" ON public.tables;
CREATE POLICY "Public read active tables" ON public.tables
  FOR SELECT USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = tables.store_id AND s.is_active = true
    )
  );

-- Sessão de mesa para clientes (sem auth)
CREATE OR REPLACE FUNCTION public.open_or_get_table_session_public(
  _store_id uuid,
  _table_number text,
  _table_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tables t
    WHERE t.store_id = _store_id AND t.number = _table_number AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'Mesa inválida ou inactiva';
  END IF;

  SELECT id INTO v_id FROM public.table_sessions
  WHERE store_id = _store_id AND table_number = _table_number AND status = 'open'
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.table_sessions (store_id, table_id, table_number, status, opened_by)
    VALUES (_store_id, _table_id, _table_number, 'open', NULL)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Cliente anónimo na mesa (nome opcional)
CREATE OR REPLACE FUNCTION public.add_or_get_table_customer_public(
  _session_id uuid,
  _name text DEFAULT 'Cliente'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_store uuid; v_label text;
BEGIN
  v_label := COALESCE(NULLIF(trim(_name), ''), 'Cliente');

  SELECT id INTO v_id FROM public.table_session_customers
  WHERE session_id = _session_id AND name = v_label AND status = 'active'
  LIMIT 1;

  IF v_id IS NULL THEN
    SELECT store_id INTO v_store FROM public.table_sessions WHERE id = _session_id;
    INSERT INTO public.table_session_customers (session_id, store_id, name)
    VALUES (_session_id, v_store, v_label)
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Cria pedido do totem/app (mesa, takeaway, delivery)
CREATE OR REPLACE FUNCTION public.create_customer_order(
  _store_id uuid,
  _order_type text,
  _items jsonb,
  _total numeric,
  _subtotal numeric DEFAULT NULL,
  _table_number text DEFAULT NULL,
  _table_id uuid DEFAULT NULL,
  _customer_name text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _payment_method text DEFAULT NULL,
  _payment_status text DEFAULT 'pending',
  _stripe_payment_intent_id text DEFAULT NULL,
  _application_fee_cents integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session uuid;
  v_customer uuid;
  v_order uuid;
  v_order_number text;
  v_item jsonb;
  v_qty int;
  v_unit numeric;
  v_line numeric;
  v_pm public.payment_method;
  v_ps public.payment_status;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  v_order_number := public.next_order_number(_store_id);

  IF _order_type = 'dine_in' AND _table_number IS NOT NULL THEN
    v_session := public.open_or_get_table_session_public(_store_id, _table_number, _table_id);
    v_customer := public.add_or_get_table_customer_public(v_session, COALESCE(_customer_name, 'Cliente'));
  END IF;

  v_ps := COALESCE(_payment_status::public.payment_status, 'pending'::public.payment_status);

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method
    WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
    WHEN 'google_pay' THEN 'google_pay'::public.payment_method
    ELSE NULL
  END;

  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, customer_phone, table_number,
    table_session_id, table_customer_id,
    subtotal, total, notes,
    payment_method, payment_status, stripe_payment_intent_id, application_fee_cents
  ) VALUES (
    _store_id, v_order_number, 'totem'::order_source, 'pending'::order_status, _order_type,
    NULLIF(trim(_customer_name), ''), NULLIF(trim(_customer_phone), ''), _table_number,
    v_session, v_customer,
    COALESCE(_subtotal, _total), _total, _notes,
    v_pm, v_ps, _stripe_payment_intent_id, COALESCE(_application_fee_cents, 0)
  ) RETURNING id INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line := COALESCE((v_item->>'total_price')::numeric, v_qty * v_unit);

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      size_name, extras, removed, notes
    ) VALUES (
      v_order,
      NULLIF(v_item->>'product_id', '')::uuid,
      COALESCE(v_item->>'product_name', 'Item'),
      v_qty, v_unit, v_line,
      v_item->>'size_name',
      COALESCE(v_item->'extras', '[]'::jsonb),
      COALESCE(v_item->'removed', '[]'::jsonb),
      v_item->>'notes'
    );
  END LOOP;

  IF v_session IS NOT NULL AND v_customer IS NOT NULL THEN
    UPDATE public.table_session_customers
    SET total_amount = total_amount + _total, updated_at = now()
    WHERE id = v_customer;
    UPDATE public.table_sessions
    SET total_amount = total_amount + _total, updated_at = now()
    WHERE id = v_session;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order,
    'order_number', v_order_number,
    'session_id', v_session,
    'customer_id', v_customer
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_or_get_table_session_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_or_get_table_customer_public TO anon, authenticated;

-- Confirma pagamento (webhook Stripe ou cliente)
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  _stripe_payment_intent_id text,
  _payment_status text DEFAULT 'paid'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  UPDATE public.orders
  SET payment_status = _payment_status::public.payment_status,
      payment_method = COALESCE(payment_method, 'card'::public.payment_method),
      updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'store_id', v_order.store_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_payment TO anon, authenticated, service_role;
