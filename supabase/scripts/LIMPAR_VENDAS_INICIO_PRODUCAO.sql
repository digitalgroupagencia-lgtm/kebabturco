-- =============================================================================
-- LIMPAR VENDAS E DADOS DE TESTE — Kebab Turco Gandia (início operação real)
-- Correr no Lovable Cloud → Database → SQL (como service_role / SQL editor).
-- NÃO apaga cardápio, produtos, categorias nem configurações Stripe.
-- =============================================================================

DO $$
DECLARE
  v_store_id uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_orders bigint;
  v_ledger bigint;
  v_print bigint;
  v_gw_tx bigint;
  v_gw_log bigint;
  v_coupons bigint;
  v_cash bigint;
BEGIN
  DELETE FROM public.coupon_redemptions
  WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);
  GET DIAGNOSTICS v_coupons = ROW_COUNT;

  DELETE FROM public.print_jobs
  WHERE store_id = v_store_id
     OR order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);
  GET DIAGNOSTICS v_print = ROW_COUNT;

  DELETE FROM public.payment_gateway_logs WHERE store_id = v_store_id;
  GET DIAGNOSTICS v_gw_log = ROW_COUNT;

  DELETE FROM public.payment_gateway_transactions WHERE store_id = v_store_id;
  GET DIAGNOSTICS v_gw_tx = ROW_COUNT;

  DELETE FROM public.store_payment_ledger WHERE store_id = v_store_id;
  GET DIAGNOSTICS v_ledger = ROW_COUNT;

  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = v_store_id);

  DELETE FROM public.orders WHERE store_id = v_store_id;
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  DELETE FROM public.cash_registers WHERE store_id = v_store_id;
  GET DIAGNOSTICS v_cash = ROW_COUNT;

  -- Fechar mesas abertas de teste (opcional — não apaga mesas, só sessões)
  UPDATE public.table_sessions
  SET status = 'closed', closed_at = now(), updated_at = now()
  WHERE store_id = v_store_id AND status = 'open';

  RAISE NOTICE 'Pedidos apagados: %', v_orders;
  RAISE NOTICE 'Movimentos financeiros apagados: %', v_ledger;
  RAISE NOTICE 'Fila de impressão apagada: %', v_print;
  RAISE NOTICE 'Transacções gateway apagadas: %', v_gw_tx;
  RAISE NOTICE 'Logs gateway apagados: %', v_gw_log;
  RAISE NOTICE 'Cupões usados apagados: %', v_coupons;
  RAISE NOTICE 'Caixa apagado: %', v_cash;
END $$;

-- Verificação rápida (deve devolver 0 em tudo)
SELECT
  (SELECT COUNT(*) FROM public.orders WHERE store_id = '22222222-2222-2222-2222-222222222222') AS pedidos,
  (SELECT COUNT(*) FROM public.store_payment_ledger WHERE store_id = '22222222-2222-2222-2222-222222222222') AS financeiro,
  (SELECT COUNT(*) FROM public.print_jobs WHERE store_id = '22222222-2222-2222-2222-222222222222') AS impressao;
