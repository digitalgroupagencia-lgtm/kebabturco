-- =============================================================================
-- LIMPAR APENAS PEDIDOS DE TESTE — Gandia (seguro para operação real)
-- Não apaga vendas reais (Bizum, cartão, etc.).
-- Correr no Lovable Cloud → Database → SQL
-- =============================================================================

DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_orders bigint;
BEGIN
  DELETE FROM public.coupon_redemptions
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE store_id = v_store_id AND is_test = true
  );

  DELETE FROM public.print_jobs
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE store_id = v_store_id AND is_test = true
  );

  DELETE FROM public.store_payment_ledger
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE store_id = v_store_id AND is_test = true
  );

  DELETE FROM public.order_items
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE store_id = v_store_id AND is_test = true
  );

  DELETE FROM public.orders
  WHERE store_id = v_store_id AND is_test = true;
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  RAISE NOTICE 'Pedidos de TESTE apagados: %', v_orders;
  RAISE NOTICE 'Vendas reais (Bizum/cartão) NÃO foram apagadas.';
END $$;

SELECT
  COUNT(*) FILTER (WHERE is_test = false) AS vendas_reais,
  COUNT(*) FILTER (WHERE is_test = true) AS pedidos_teste
FROM public.orders
WHERE store_id = '22222222-2222-2222-2222-222222222222';
