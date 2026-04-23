-- Adiciona logos por tela específica (idioma e tipo de pedido) no Admin Master
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_language_url text,
  ADD COLUMN IF NOT EXISTS logo_order_type_url text;

-- Garantir que o projeto El Rey use espanhol como idioma principal
UPDATE public.totem_config
SET 
  primary_language = 'es',
  active_languages = ARRAY['es','en','pt']::text[]
WHERE store_id = 'b0000000-0000-0000-0000-000000000001'
  AND (primary_language IS DISTINCT FROM 'es' OR active_languages IS NULL OR array_length(active_languages, 1) IS NULL);
