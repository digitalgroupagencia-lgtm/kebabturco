CREATE OR REPLACE FUNCTION public.record_payment_settlement(
  _stripe_payment_intent_id text,
  _platform_fee_cents integer,
  _stripe_fee_cents integer,
  _processing_fee_cents integer,
  _net_to_store_cents integer,
  _online_service_fee_cents integer DEFAULT NULL
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
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  v_service_fee := COALESCE(_online_service_fee_cents, _processing_fee_cents, 0);
  v_restaurant_gross := COALESCE(
    _net_to_store_cents,
    ROUND((v_order.subtotal + COALESCE(v_order.delivery_fee, 0) - COALESCE(v_order.discount_amount, 0)) * 100)::integer
  );

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, 'card'::public.payment_method),
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

DROP FUNCTION IF EXISTS public.record_payment_settlement(text, integer, integer, integer, integer);

GRANT EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer) TO service_role;