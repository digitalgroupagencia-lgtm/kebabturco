-- =============================================================================
-- KEBAB — reenviar pedidos pagos para o PDV WGM
-- =============================================================================
-- ONDE: Supabase do KEBAB (kvpssbhclafoymhecmuk)
--
-- A ponte NÃO envia pedidos antigos sozinha. Só dispara quando um pedido
-- passa a «pago» DEPOIS da ponte estar activa.
-- Este script mete na fila os pedidos pagos que ainda não foram ao PDV.
--
-- ANTES:
--   • Ponte activa (KEBAB_ATIVAR_PONTE_WGM.sql)
--   • Unidades com flow_store_id
--   • Secrets WGM no Lovable + Publish
-- DEPOIS:
--   • Admin Kebab → Ponte PDV WGM → «Processar fila pendente»
--   • Ou esperar o cron (cada 3 min)
-- =============================================================================

DO $$
DECLARE
  v_enabled boolean;
  v_queued int := 0;
  r record;
BEGIN
  SELECT enabled INTO v_enabled FROM public.wgm_integration_config WHERE id = 1;
  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'Ponte desactivada. Corra KEBAB_ATIVAR_PONTE_WGM.sql primeiro.';
  END IF;

  FOR r IN
    SELECT o.id AS order_id, o.store_id
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.payment_status = 'paid'
      AND COALESCE(o.is_test, false) = false
      AND s.flow_store_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.wgm_order_refs ref
        WHERE ref.order_id = o.id AND ref.synced_at IS NOT NULL
      )
    ORDER BY o.created_at ASC
  LOOP
    PERFORM public.enqueue_wgm_order_sync(r.order_id, r.store_id, 'order.paid');
    PERFORM public.dispatch_wgm_sync(r.order_id, 'order.paid');
    v_queued := v_queued + 1;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Pedidos colocados na fila para o PDV: %', v_queued;
  RAISE NOTICE 'No admin: Ponte PDV WGM → Processar fila pendente';
  RAISE NOTICE 'No PDV: Pedidos e Vendas (origem app_cliente)';
END $$;

-- Confirmação
SELECT status, COUNT(*) FROM public.flow_webhook_queue GROUP BY status;

SELECT
  o.order_number,
  o.customer_name,
  o.total,
  q.status AS fila,
  q.last_error,
  r.synced_at AS enviado_pdv
FROM public.orders o
LEFT JOIN public.flow_webhook_queue q ON q.order_id = o.id AND q.event_type = 'order.paid'
LEFT JOIN public.wgm_order_refs r ON r.order_id = o.id
WHERE o.payment_status = 'paid' AND COALESCE(o.is_test, false) = false
ORDER BY o.created_at DESC
LIMIT 20;
