-- =====================================================================
-- PASSO 1 — Correr no SQL Editor do KEBAB TURCO (projeto oficial).
-- PASSO 2 — Exportar o resultado: copiar toda a coluna sql_chunk (ou CSV).
-- PASSO 3 — Juntar num .sql e correr no PROPrioAPP.
-- =====================================================================
-- Usa só colunas base (funciona mesmo se faltarem migrações novas no Kebab).
-- =====================================================================

SELECT sql_chunk
FROM (
  SELECT 1 AS ord, 1 AS sub, '-- IMPORT CARDÁPIO GANDIA' AS sql_chunk
  UNION ALL SELECT 2, 1, 'DELETE FROM public.products WHERE store_id = ''22222222-2222-2222-2222-222222222222'';'
  UNION ALL SELECT 3, 1, 'DELETE FROM public.categories WHERE store_id = ''22222222-2222-2222-2222-222222222222'';'
  UNION ALL SELECT 4, 1, 'DELETE FROM public.promo_banners WHERE store_id = ''22222222-2222-2222-2222-222222222222'';'

  UNION ALL
  SELECT 10, c.sort_order,
    format(
      'INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES (''22222222-2222-2222-2222-222222222222'', %L::jsonb, %s, %s, %s);',
      c.name::text,
      CASE WHEN c.image_url IS NULL OR c.image_url = '' THEN 'NULL' ELSE quote_literal(c.image_url) END,
      COALESCE(c.is_active, true),
      COALESCE(c.sort_order, 0)
    )
  FROM public.categories c
  WHERE c.store_id = '22222222-2222-2222-2222-222222222222'

  UNION ALL
  SELECT 100, p.sort_order,
    format(
      $q$
INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  %L::jsonb,
  %L::jsonb,
  %s,
  %s,
  %s, %s, %s, %s
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = %L
LIMIT 1;
$q$,
      p.name::text,
      COALESCE(p.description, '{}')::text,
      p.price,
      CASE WHEN p.image_url IS NULL OR p.image_url = '' OR p.image_url LIKE '%%placeholder%%'
        THEN 'NULL' ELSE quote_literal(p.image_url) END,
      COALESCE(p.is_active, true),
      COALESCE(p.is_bestseller, false),
      COALESCE(p.is_promo, false),
      COALESCE(p.sort_order, 0),
      COALESCE(c.name->>'es', c.name->>'pt', '')
    )
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  WHERE p.store_id = '22222222-2222-2222-2222-222222222222'

  UNION ALL
  SELECT 200, b.sort_order,
    format(
      'INSERT INTO public.promo_banners (store_id, image_url, video_url, media_type, link_url, video_autoplay, video_muted, is_active, sort_order) VALUES (''22222222-2222-2222-2222-222222222222'', %s, %s, %s, %s, %s, %s, %s, %s);',
      CASE WHEN b.image_url IS NULL THEN 'NULL' ELSE quote_literal(b.image_url) END,
      CASE WHEN b.video_url IS NULL THEN 'NULL' ELSE quote_literal(b.video_url) END,
      quote_literal(COALESCE(b.media_type, 'image')),
      CASE WHEN b.link_url IS NULL THEN 'NULL' ELSE quote_literal(b.link_url) END,
      COALESCE(b.video_autoplay, true),
      COALESCE(b.video_muted, true),
      COALESCE(b.is_active, true),
      COALESCE(b.sort_order, 0)
    )
  FROM public.promo_banners b
  WHERE b.store_id = '22222222-2222-2222-2222-222222222222'
) t
ORDER BY t.ord, t.sub;
