-- =============================================================================
-- PERIGO: apaga TODAS as vendas, incluindo pagamentos reais já cobrados.
-- Só usar se tiver a certeza absoluta. Para limpar testes, use LIMPAR_VENDAS_INICIO_PRODUCAO.sql
-- =============================================================================

DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_orders bigint;
BEGIN
  DELETE FROM public.coupon_redemptions
  WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);

  DELETE FROM public.print_jobs
  WHERE store_id = v_store_id
     OR order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);

  DELETE FROM public.payment_gateway_logs WHERE store_id = v_store_id;
  DELETE FROM public.payment_gateway_transactions WHERE store_id = v_store_id;
  DELETE FROM public.store_payment_ledger WHERE store_id = v_store_id;

  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);

  DELETE FROM public.orders WHERE store_id = v_store_id;
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  DELETE FROM public.cash_registers WHERE store_id = v_store_id;

  RAISE NOTICE 'TODAS as vendas apagadas: %', v_orders;
END $$;
