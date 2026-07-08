-- Hardening: customer order creation recalculates financials server-side.
-- - Ignores frontend _total/_subtotal/_delivery_fee/_discount_amount.
-- - Uses compute_order_item_unit_price() to build a canonical cart for validate_coupon().

CREATE OR REPLACE FUNCTION public.create_customer_order(
  _store_id uuid,
  _order_type text,
  _items jsonb,
  _total numeric,
  _subtotal numeric DEFAULT NULL::numeric,
  _table_number text DEFAULT NULL::text,
  _table_id uuid DEFAULT NULL::uuid,
  _customer_name text DEFAULT NULL::text,
  _customer_phone text DEFAULT NULL::text,
  _notes text DEFAULT NULL::text,
  _payment_method text DEFAULT NULL::text,
  _payment_status text DEFAULT 'pending'::text,
  _stripe_payment_intent_id text DEFAULT NULL::text,
  _application_fee_cents integer DEFAULT 0,
  _delivery_street text DEFAULT NULL::text,
  _delivery_number text DEFAULT NULL::text,
  _delivery_complement text DEFAULT NULL::text,
  _delivery_postal_code text DEFAULT NULL::text,
  _delivery_city text DEFAULT NULL::text,
  _delivery_notes text DEFAULT NULL::text,
  _delivery_fee numeric DEFAULT 0,
  _delivery_zone_id uuid DEFAULT NULL::uuid,
  _delivery_zone_name text DEFAULT NULL::text,
  _coupon_code text DEFAULT NULL::text,
  _discount_amount numeric DEFAULT 0,
  _coupon_id uuid DEFAULT NULL::uuid,
  _online_service_fee_cents integer DEFAULT 0,
  _platform_fee_cents integer DEFAULT 0,
  _stripe_fee_cents integer DEFAULT 0,
  _net_to_store_cents integer DEFAULT NULL::integer,
  _stripe_connect_account_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session uuid;
  v_customer uuid;
  v_customer_profile uuid;
  v_order uuid;
  v_order_number text;

  v_item jsonb;
  v_qty int;
  v_unit numeric;
  v_line numeric;
  v_product_id uuid;

  v_pm public.payment_method;
  v_ps public.payment_status;

  v_zone_min numeric;
  v_delivery_zone_fee numeric := 0;
  v_delivery_zone_name_final text := NULL;

  v_sub numeric := 0;
  v_cart_items jsonb := '[]'::jsonb;

  v_discount_amount_final numeric := 0;
  v_coupon_id_final uuid := NULL;
  v_coupon_code_final text := NULL;
  v_validate jsonb;

  v_total_final numeric;

  v_prep_min integer;
  v_loyalty jsonb;
  v_ops public.operations_settings%ROWTYPE;
  v_table_validated boolean := false;
  v_is_anon boolean := (auth.uid() IS NULL);
  v_store public.stores%ROWTYPE;
  v_test_simulated boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = _store_id;
  v_test_simulated := COALESCE(v_store.stripe_connect_test_simulated, false)
    OR v_store.stripe_connect_environment = 'test';
  SELECT * INTO v_ops FROM public.operations_settings WHERE store_id = _store_id LIMIT 1;

  -- Build canonical cart and subtotal (ignore frontend prices/totals)
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_product_id := NULL;

    IF (v_item->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT p.id INTO v_product_id
      FROM public.products p
      WHERE p.id = (v_item->>'product_id')::uuid
        AND p.store_id = _store_id
        AND p.is_active = true
      LIMIT 1;
    END IF;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Produto inválido';
    END IF;

    v_unit := public.compute_order_item_unit_price(
      _store_id,
      v_product_id,
      v_item->>'size_name',
      COALESCE(v_item->'selections', '[]'::jsonb),
      COALESCE(v_item->'extras', '[]'::jsonb)
    );
    v_line := ROUND(v_qty * v_unit, 2);

    v_sub := v_sub + v_line;

    v_cart_items := v_cart_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product_id::text,
        'quantity', v_qty,
        'unit_price', v_unit
      )
    );
  END LOOP;
  v_sub := ROUND(v_sub, 2);

  -- Table / delivery validations (based on computed subtotal)
  IF _order_type = 'dine_in' THEN
    IF _table_id IS NULL THEN
      RAISE EXCEPTION 'Pedido na mesa requer QR code válido';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tables t
      WHERE t.id = _table_id AND t.store_id = _store_id AND t.is_active = true
        AND (_table_number IS NULL OR t.number = _table_number)
    ) THEN
      RAISE EXCEPTION 'Mesa inválida ou inactiva';
    END IF;
    v_table_validated := true;
  END IF;

  IF _order_type = 'delivery' THEN
    IF NULLIF(trim(_delivery_street), '') IS NULL OR NULLIF(trim(_delivery_number), '') IS NULL
       OR NULLIF(trim(_delivery_postal_code), '') IS NULL OR NULLIF(trim(_delivery_city), '') IS NULL THEN
      RAISE EXCEPTION 'Morada de entrega incompleta';
    END IF;
    IF NULLIF(trim(_customer_phone), '') IS NULL THEN
      RAISE EXCEPTION 'Telefone obrigatório para delivery';
    END IF;
    IF _delivery_zone_id IS NULL THEN
      RAISE EXCEPTION 'Endereço fora da zona de entrega';
    END IF;

    SELECT min_order, delivery_fee, name
      INTO v_zone_min, v_delivery_zone_fee, v_delivery_zone_name_final
    FROM public.delivery_zones
    WHERE id = _delivery_zone_id
      AND store_id = _store_id
      AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Zona de entrega inválida';
    END IF;

    IF v_sub < COALESCE(v_zone_min, 0) THEN
      RAISE EXCEPTION 'Pedido abaixo do mínimo da zona (%.2f €)', v_zone_min;
    END IF;
  END IF;

  -- Coupon: recalculate discount server-side from canonical cart
  IF _coupon_id IS NOT NULL THEN
    SELECT c.code, c.id
      INTO v_coupon_code_final, v_coupon_id_final
    FROM public.coupons c
    WHERE c.id = _coupon_id
      AND c.store_id = _store_id
      AND c.is_active = true
    LIMIT 1;

    IF v_coupon_id_final IS NULL THEN
      RAISE EXCEPTION 'Cupón inválido';
    END IF;

    v_validate := public.validate_coupon(
      _store_id,
      v_coupon_code_final,
      v_sub,
      COALESCE(v_delivery_zone_fee, 0),
      v_cart_items
    );
  ELSIF NULLIF(trim(_coupon_code), '') IS NOT NULL THEN
    v_validate := public.validate_coupon(
      _store_id,
      _coupon_code,
      v_sub,
      COALESCE(v_delivery_zone_fee, 0),
      v_cart_items
    );
    IF (v_validate->>'coupon_id') IS NOT NULL THEN
      v_coupon_id_final := (v_validate->>'coupon_id')::uuid;
      v_coupon_code_final := v_validate->>'code';
    END IF;
  END IF;

  IF v_validate IS NOT NULL THEN
    IF (v_validate->>'valid')::boolean IS DISTINCT FROM true THEN
      RAISE EXCEPTION COALESCE(v_validate->>'error', 'Cupón inválido');
    END IF;
    v_discount_amount_final := ROUND(COALESCE((v_validate->>'discount_amount')::numeric, 0), 2);
  END IF;

  v_total_final := ROUND(GREATEST(0, v_sub + COALESCE(v_delivery_zone_fee, 0) - COALESCE(v_discount_amount_final, 0)), 2);

  -- Payment restrictions (kept from original logic)
  IF _order_type = 'takeaway' AND _payment_method = 'cash' AND NOT COALESCE(v_ops.pay_cash_takeaway, false) THEN
    RAISE EXCEPTION 'Pagamento em dinheiro não permitido para takeaway';
  END IF;
  IF _order_type = 'delivery' AND _payment_method = 'cash' AND NOT COALESCE(v_ops.pay_cash_delivery, false) THEN
    RAISE EXCEPTION 'Pagamento em dinheiro não permitido para entrega';
  END IF;
  IF _order_type = 'dine_in' AND _payment_method = 'cash' AND NOT COALESCE(v_ops.pay_cash_dine_in, true) THEN
    RAISE EXCEPTION 'Pagamento em dinheiro não permitido na mesa';
  END IF;

  IF _payment_method IN ('card', 'bizum') OR _stripe_payment_intent_id IS NOT NULL THEN
    IF v_test_simulated THEN
      IF NOT COALESCE(v_store.stripe_charges_enabled, false)
         OR NOT COALESCE(v_store.stripe_onboarding_completed, false) THEN
        RAISE EXCEPTION 'Recebimentos online ainda não activos para esta loja';
      END IF;
    ELSE
      IF v_store.stripe_connect_account_id IS NULL
         OR NOT COALESCE(v_store.stripe_charges_enabled, false)
         OR NOT COALESCE(v_store.stripe_onboarding_completed, false) THEN
        RAISE EXCEPTION 'Recebimentos online ainda não activos para esta loja';
      END IF;
    END IF;
  END IF;

  IF v_is_anon THEN
    IF _order_type = 'takeaway' AND COALESCE(v_ops.require_prepayment_takeaway, true) THEN
      IF _payment_method NOT IN ('card', 'bizum') OR _stripe_payment_intent_id IS NULL THEN
        RAISE EXCEPTION 'Takeaway requer pagamento online confirmado';
      END IF;
    END IF;
    IF _order_type = 'delivery' AND COALESCE(v_ops.require_prepayment_delivery, true) THEN
      IF _payment_method NOT IN ('card', 'bizum') OR _stripe_payment_intent_id IS NULL THEN
        RAISE EXCEPTION 'Entrega requer pagamento online confirmado';
      END IF;
    END IF;
  END IF;

  v_order_number := public.next_order_number(_store_id);

  IF _order_type = 'dine_in' AND v_table_validated THEN
    v_session := public.open_or_get_table_session_public(_store_id, _table_number, _table_id);
    v_customer := public.add_or_get_table_customer_public(v_session, COALESCE(_customer_name, 'Cliente'));
  END IF;

  IF NULLIF(trim(_customer_phone), '') IS NOT NULL THEN
    INSERT INTO public.customers (store_id, phone, name)
    VALUES (_store_id, trim(_customer_phone), NULLIF(trim(_customer_name), ''))
    ON CONFLICT (store_id, phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, public.customers.name),
      updated_at = now()
    RETURNING id INTO v_customer_profile;
  END IF;

  SELECT avg_prep_minutes INTO v_prep_min FROM public.operations_settings WHERE store_id = _store_id LIMIT 1;

  v_ps := CASE
    WHEN v_is_anon THEN 'pending'::public.payment_status
    ELSE COALESCE(_payment_status::public.payment_status, 'pending'::public.payment_status)
  END;
  IF NOT v_is_anon AND _payment_status IS NOT NULL THEN
    v_ps := _payment_status::public.payment_status;
  END IF;

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method
    WHEN 'bizum' THEN 'bizum'::public.payment_method
    WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
    WHEN 'google_pay' THEN 'google_pay'::public.payment_method
    ELSE NULL
  END;

  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, customer_phone, customer_id, table_number,
    table_session_id, table_customer_id, table_validated,
    subtotal, total, notes,
    payment_method, payment_status, stripe_payment_intent_id, application_fee_cents,
    delivery_street, delivery_number, delivery_complement,
    delivery_postal_code, delivery_city, delivery_notes,
    delivery_fee, delivery_zone_id, delivery_zone_name,
    discount_amount, coupon_code,
    online_service_fee_cents, platform_fee_cents, stripe_fee_cents, net_to_store_cents,
    stripe_connect_account_id,
    estimated_ready_at
  ) VALUES (
    _store_id, v_order_number, 'totem'::order_source, 'pending'::order_status, _order_type,
    NULLIF(trim(_customer_name), ''), NULLIF(trim(_customer_phone), ''), v_customer_profile, _table_number,
    v_session, v_customer, v_table_validated,
    v_sub, v_total_final, _notes,
    v_pm, v_ps, _stripe_payment_intent_id, COALESCE(_online_service_fee_cents, _application_fee_cents, 0),
    NULLIF(trim(_delivery_street), ''), NULLIF(trim(_delivery_number), ''), NULLIF(trim(_delivery_complement), ''),
    NULLIF(trim(_delivery_postal_code), ''), NULLIF(trim(_delivery_city), ''), NULLIF(trim(_delivery_notes), ''),
    COALESCE(v_delivery_zone_fee, 0), _delivery_zone_id,
    COALESCE(v_delivery_zone_name_final, NULLIF(trim(_delivery_zone_name), '')),
    COALESCE(v_discount_amount_final, 0), NULLIF(trim(v_coupon_code_final), ''),
    COALESCE(_online_service_fee_cents, 0),
    COALESCE(_platform_fee_cents, 0),
    COALESCE(_stripe_fee_cents, 0),
    _net_to_store_cents,
    NULLIF(trim(_stripe_connect_account_id), ''),
    CASE WHEN v_prep_min IS NOT NULL THEN now() + (v_prep_min || ' minutes')::interval ELSE NULL END
  ) RETURNING id INTO v_order;

  -- Insert canonical items (use compute_order_item_unit_price again)
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_product_id := NULL;

    IF (v_item->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT p.id INTO v_product_id
      FROM public.products p
      WHERE p.id = (v_item->>'product_id')::uuid
        AND p.store_id = _store_id
        AND p.is_active = true
      LIMIT 1;
    END IF;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Produto inválido';
    END IF;

    v_unit := public.compute_order_item_unit_price(
      _store_id,
      v_product_id,
      v_item->>'size_name',
      COALESCE(v_item->'selections', '[]'::jsonb),
      COALESCE(v_item->'extras', '[]'::jsonb)
    );
    v_line := ROUND(v_qty * v_unit, 2);

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      size_name, extras, removed, notes, selections, configuration
    ) VALUES (
      v_order,
      v_product_id,
      COALESCE(v_item->>'product_name', 'Item'),
      v_qty, v_unit, v_line,
      v_item->>'size_name',
      COALESCE(v_item->'extras', '[]'::jsonb),
      COALESCE(v_item->'removed', '[]'::jsonb),
      v_item->>'notes',
      COALESCE(v_item->'selections', '[]'::jsonb),
      v_item->'configuration'
    );
  END LOOP;

  IF v_coupon_id_final IS NOT NULL AND COALESCE(v_discount_amount_final, 0) > 0 THEN
    INSERT INTO public.coupon_redemptions (coupon_id, order_id, customer_phone, discount_amount)
    VALUES (v_coupon_id_final, v_order, NULLIF(trim(_customer_phone), ''), v_discount_amount_final);
    UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon_id_final;
  END IF;

  IF v_session IS NOT NULL AND v_customer IS NOT NULL THEN
    UPDATE public.table_session_customers
    SET total_amount = total_amount + v_total_final, updated_at = now()
    WHERE id = v_customer;
    UPDATE public.table_sessions
    SET total_amount = total_amount + v_total_final, updated_at = now()
    WHERE id = v_session;
  END IF;

  IF NULLIF(trim(_customer_phone), '') IS NOT NULL THEN
    v_loyalty := public.add_loyalty_stamp(_store_id, _customer_phone, v_customer_profile);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order,
    'order_number', v_order_number,
    'session_id', v_session,
    'customer_id', v_customer,
    'loyalty', v_loyalty,
    'table_validated', v_table_validated
  );
END;
$function$;

