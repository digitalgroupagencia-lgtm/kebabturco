UPDATE public.totem_config
SET active_languages = ARRAY['es', 'pt', 'en']::text[],
    primary_language = 'es'
WHERE store_id = 'b0000000-0000-0000-0000-000000000001';