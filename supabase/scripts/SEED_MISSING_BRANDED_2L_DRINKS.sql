-- Cria Coca-Cola 2L e Fanta Naranja 2L na categoria Bebidas (se ainda não existirem).
-- Correr depois de FIX_HIDE_GENERIC_DRINKS.sql.

INSERT INTO public.products (
  store_id,
  category_id,
  name,
  description,
  price,
  image_url,
  is_active,
  is_bestseller,
  is_promo,
  sort_order,
  product_type
)
SELECT
  c.store_id,
  c.id,
  jsonb_build_object(
    'es', drink.label,
    'pt', drink.label,
    'en', drink.label,
    'fr', drink.label
  ),
  jsonb_build_object('es', '', 'pt', '', 'en', '', 'fr', ''),
  drink.price,
  '/product-placeholder.svg',
  true,
  false,
  false,
  COALESCE(
    (SELECT MAX(p.sort_order) FROM public.products p WHERE p.category_id = c.id),
    0
  ) + drink.ord,
  'simple'
FROM public.categories c
CROSS JOIN (
  VALUES
    ('Coca-Cola 2L', 3.00::numeric, 1),
    ('Fanta Naranja 2L', 3.00::numeric, 2)
) AS drink(label, price, ord)
WHERE lower(
  coalesce(c.name->>'es', '') || ' ' || coalesce(c.name->>'pt', '')
) ~* 'bebida|drink|boisson|refresco'
AND NOT EXISTS (
  SELECT 1
  FROM public.products p
  WHERE p.category_id = c.id
  AND p.is_active = true
  AND lower(trim(coalesce(p.name->>'es', p.name->>'pt', ''))) = lower(drink.label)
);
