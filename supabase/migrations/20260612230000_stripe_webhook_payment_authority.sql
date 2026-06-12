-- Webhook como fonte de verdade: falhas de pagamento + método correcto no settlement.

CREATE OR REPLACE FUNCTION public.record_payment_settlement(
  _stripe_payment_intent_id text,
  _platform_fee_cents integer,
  _stripe_fee_cents integer,
  _processing_fee_cents integer,
  _net_to_store_cents integer,
  _online_service_fee_cents integer DEFAULT NULL,
  _payment_method text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_service_fee integer;
  v_restaurant_gross integer;
  v_pm public.payment_method;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'store_id', v_order.store_id
    );
  END IF;

  v_service_fee := COALESCE(_online_service_fee_cents, _processing_fee_cents, 0);
  v_restaurant_gross := COALESCE(
    _net_to_store_cents,
    ROUND((v_order.subtotal + COALESCE(v_order.delivery_fee, 0) - COALESCE(v_order.discount_amount, 0)) * 100)::integer
  );

  v_pm := CASE lower(trim(COALESCE(_payment_method, '')))
    WHEN 'bizum' THEN 'bizum'::public.payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
    WHEN 'google_pay' THEN 'google_pay'::public.payment_method
    ELSE NULL
  END;

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(v_pm, payment_method, 'card'::public.payment_method),
    platform_fee_cents = COALESCE(_platform_fee_cents, 0),
    stripe_fee_cents = COALESCE(_stripe_fee_cents, 0),
    online_service_fee_cents = v_service_fee,
    processing_fee_cents = v_service_fee,
    application_fee_cents = v_service_fee,
    net_to_store_cents = v_restaurant_gross,
    updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.store_payment_ledger (
    store_id, order_id, entry_type,
    gross_cents, platform_fee_cents, stripe_fee_cents, processing_fee_cents, net_cents,
    stripe_payment_intent_id, description
  )
  VALUES (
    v_order.store_id, v_order.id, 'order_payment',
    v_restaurant_gross,
    COALESCE(_platform_fee_cents, 0),
    COALESCE(_stripe_fee_cents, 0),
    v_service_fee,
    v_restaurant_gross,
    _stripe_payment_intent_id,
    'Pedido #' || v_order.order_number
  )
  ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'store_id', v_order.store_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_failure(
  _stripe_payment_intent_id text,
  _failure_code text DEFAULT NULL,
  _failure_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number
    );
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'failed'::public.payment_status,
    notes = CASE
      WHEN _failure_message IS NOT NULL AND trim(_failure_message) <> '' THEN
        trim(COALESCE(v_order.notes, '') || CASE WHEN v_order.notes IS NOT NULL AND trim(v_order.notes) <> '' THEN ' | ' ELSE '' END
          || 'Pagamento falhou: ' || left(_failure_message, 200))
      ELSE v_order.notes
    END,
    updated_at = now()
  WHERE id = v_order.id
    AND payment_status = 'pending'::public.payment_status;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'failure_code', _failure_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_failure(text, text, text) TO service_role;
