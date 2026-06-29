-- =============================================================================
-- KEBAB — diagnosticar ponte PDV WGM
-- =============================================================================
-- ONDE: Supabase do KEBAB (kvpssbhclafoymhecmuk)
-- =============================================================================

-- 1) Ponte ligada?
SELECT enabled AS ponte_ligada, marketplace_webhook_url
FROM public.wgm_integration_config WHERE id = 1;

-- 2) Unidades com ID no PDV?
SELECT name AS unidade, flow_store_id AS id_pdv,
  CASE WHEN flow_store_id IS NULL THEN 'FALTA' ELSE 'OK' END AS estado
FROM public.stores ORDER BY name;

-- 3) Fila de envio (erros aparecem em last_error)
SELECT status, COUNT(*) AS qtd
FROM public.flow_webhook_queue
GROUP BY status ORDER BY status;

SELECT id, order_id, event_type, status, last_error, created_at
FROM public.flow_webhook_queue
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC
LIMIT 20;

-- 4) Pedidos pagos na app vs já enviados ao PDV
SELECT
  (SELECT COUNT(*) FROM public.orders
   WHERE payment_status = 'paid' AND COALESCE(is_test, false) = false) AS pedidos_pagos_app,
  (SELECT COUNT(*) FROM public.wgm_order_refs WHERE synced_at IS NOT NULL) AS ja_no_pdv,
  (SELECT COUNT(*) FROM public.orders o
   WHERE o.payment_status = 'paid' AND COALESCE(o.is_test, false) = false
     AND NOT EXISTS (
       SELECT 1 FROM public.wgm_order_refs r
       WHERE r.order_id = o.id AND r.synced_at IS NOT NULL
     )) AS faltam_enviar;

-- 5) Últimos envios / falhas
SELECT
  o.order_number,
  o.customer_name,
  o.total,
  o.payment_status,
  o.created_at,
  r.synced_at,
  r.wgm_order_numero,
  r.last_error
FROM public.orders o
LEFT JOIN public.wgm_order_refs r ON r.order_id = o.id
WHERE o.payment_status = 'paid' AND COALESCE(o.is_test, false) = false
ORDER BY o.created_at DESC
LIMIT 15;
