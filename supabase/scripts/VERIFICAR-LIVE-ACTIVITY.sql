-- Verificar se a Live Activity remota pode funcionar (tokens registados)
-- Correr no SQL Editor Supabase após abrir a app da equipa com alertas ligados

SELECT
  store_id,
  user_id,
  token_kind,
  left(token_value, 12) || '…' AS token_preview,
  updated_at
FROM public.staff_live_activity_tokens
WHERE token_kind = 'push_to_start'
ORDER BY updated_at DESC
LIMIT 20;

-- Deve existir pelo menos 1 linha por telemóneo da equipa com alertas ligados.
-- Se vazio: abrir app equipa → ligar alertas → fechar e reabrir uma vez.

SELECT id, status, order_number, total, order_type, created_at
FROM public.orders
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
