-- =============================================================================
-- RECUPERAR o pedido real de 4,50 € (Bizum) apagado por engano na limpeza
-- Correr no Lovable Cloud → Database → SQL
--
-- ANTES: na Stripe (pagamento de 4,50 €) copie o "Payment intent ID" (começa por pi_)
-- e substitua abaixo em v_payment_intent_id.
-- =============================================================================

DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_payment_intent_id text := 'COLOCAR_pi_xxx_DA_STRIPE_AQUI';
  v_connect_account text := 'acct_1ThGBRCmGR5UPOtp';
  v_customer_name text := 'Matheus';
  v_customer_phone text := '+34637917350';
  v_order_id uuid;
  v_order_number text;
  v_product_id uuid;
  v_product_name text;
BEGIN
  IF v_payment_intent_id = 'COLOCAR_pi_xxx_DA_STRIPE_AQUI' THEN
    RAISE EXCEPTION 'Substitua v_payment_intent_id pelo ID pi_... da Stripe (pagamento 4,50 €)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE stripe_payment_intent_id = v_payment_intent_id
  ) THEN
    RAISE NOTICE 'Este pagamento já tem pedido no sistema — nada a fazer.';
    RETURN;
  END IF;

  SELECT p.id, COALESCE(p.name->>'es', p.name->>'pt', 'Pan de Pita de Pollo')
  INTO v_product_id, v_product_name
  FROM public.products p
  WHERE p.store_id = v_store_id
    AND p.is_active = true
    AND (
      p.name->>'es' ILIKE '%Pita%Pollo%'
      OR p.name->>'es' ILIKE '%Pan de Pita%'
      OR p.name->>'pt' ILIKE '%Pita%Frango%'
    )
  ORDER BY p.sort_order NULLS LAST
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Produto Pan de Pita de Pollo não encontrado — ajuste o nome na query';
  END IF;

  v_order_number := public.next_order_number(v_store_id);

  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, customer_phone,
    subtotal, total, notes,
    payment_method, payment_status, stripe_payment_intent_id,
    online_service_fee_cents, platform_fee_cents, stripe_fee_cents,
    net_to_store_cents, stripe_connect_account_id,
    is_test, created_at, updated_at
  ) VALUES (
    v_store_id, v_order_number, 'totem', 'pending', 'takeaway',
    v_customer_name, v_customer_phone,
    4.50, 4.50, 'Recuperado após limpeza — pagamento Bizum real',
    'card', 'paid', v_payment_intent_id,
    134, 100, 34,
    316, v_connect_account,
    false, timestamptz '2026-06-12 17:27:00+02', now()
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price, total_price, removed, extras
  ) VALUES (
    v_order_id, v_product_id, v_product_name, 1, 4.50, 4.50,
    '["Sin picante"]'::jsonb, '[]'::jsonb
  );

  INSERT INTO public.customers (store_id, phone, name)
  VALUES (v_store_id, v_customer_phone, v_customer_name)
  ON CONFLICT (store_id, phone) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.customers.name),
    updated_at = now();

  PERFORM public.record_payment_settlement(
    v_payment_intent_id,
    100,
    34,
    134,
    316,
    134
  );

  RAISE NOTICE 'Pedido recuperado: % (id %)', v_order_number, v_order_id;
END $$;

SELECT id, order_number, total, payment_status, customer_name, customer_phone, stripe_payment_intent_id
FROM public.orders
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid
ORDER BY created_at DESC
LIMIT 5;
