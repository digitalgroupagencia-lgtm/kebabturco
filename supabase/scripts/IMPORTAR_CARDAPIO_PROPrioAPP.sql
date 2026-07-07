DELETE FROM public.products WHERE store_id = '22222222-2222-2222-2222-222222222222';

DELETE FROM public.categories WHERE store_id = '22222222-2222-2222-2222-222222222222';

DELETE FROM public.promo_banners WHERE store_id = '22222222-2222-2222-2222-222222222222';

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"es": "🔥 Ofertas Combo"}'::jsonb, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/categories/b1a4700f-4070-4f2c-b6fb-39c0603fffc9-1780564678141.png', true , 0);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🥙 Pan Pita", "es": "🥙 Pan Pita", "fr": "🥙 Pan Pita", "pt": "🥙 Pan Pita"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/a072dc7f-9b9b-4e7d-8010-6be130b5aa9a-1779309224679.png', true , 1);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🌯 Rollo Kebab", "es": "🌯 Rollo Kebab", "fr": "🌯 Rollo Kebab", "pt": "🌯 Rollo Kebab"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/768664d0-80e3-4ba7-af85-4c2fa901fef7-1779309184865.png', true , 2);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🍔 Burguer", "es": "🍔 Burguer", "fr": "🍔 Burguer", "pt": "🍔 Burguer"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/76b8c8a3-efbd-47d8-89f9-d3217383f8f1-1779309152566.png', true , 3);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🍕 Pizzas", "es": "🍕 Pizzas", "fr": "🍕 Pizzas", "pt": "🍕 Pizzas"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/b1f08653-2217-4bf1-889b-2677e32bae60-1779309199750.png', true , 4);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🍟 Patatas", "es": "🍟 Patatas", "fr": "🍟 Patatas", "pt": "🍟 Patatas"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/ec4058ab-6883-43bd-afee-1608d00d6951-1779309146847.png', true , 5);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"es": "🍽️ Platos"}'::jsonb, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/categories/4ef52dd2-3430-4375-aa23-b49e38c87c03-1780564588296.png', true , 6);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🥗 Ensaladas", "es": "🥗 Ensaladas", "fr": "🥗 Ensaladas", "pt": "🥗 Ensaladas"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/1987257c-1290-4844-87f3-139d59105c82-1779309130845.png', true , 7);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "🍗 Pollo Crispy", "es": "🍗 Pollo Crispy", "fr": "🍗 Pollo Crispy", "pt": "🍗 Pollo Crispy"}'::jsonb, 'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/0d369a7b-7cca-4a7a-8466-c9958fdfeaf8-1779309138223.png', true , 8);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"es": "🥤 Menús"}'::jsonb, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/categories/17849035-2936-4e5d-8687-33cb6867ded8-1780564650694.png', true , 9);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"es": "🥤 Bebidas"}'::jsonb, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/categories/ecbc3122-3258-4741-929a-f0eb03e6b107-1780564616067.webp', true , 10);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "Durum", "es": "Durum", "fr": "Durum", "pt": "Durum"}'::jsonb, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/categories/a595c4f5-3cc1-4876-bef6-f59d49cfae0c-durum.jpg', true , 11);

INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', '{"en": "Kapsalon", "es": "Kapsalon", "fr": "Kapsalon", "pt": "Kapsalon"}'::jsonb, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/categories/53f14571-ec6b-4772-a54d-c58005d2d40d-kapsalon.jpg', true , 12);

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "42 XXL — Pollo Crispy 10ud", "es": "42 XXL — Pollo Crispy 10ud", "fr": "42 XXL — Pollo Crispy 10ud", "pt": "42 XXL — Pollo Crispy 10ud"}'::jsonb,
  '{"en": "10 piezas de pollo crispy", "es": "10 piezas de pollo crispy", "fr": "10 piezas de pollo crispy", "pt": "10 piezas de pollo crispy"}'::jsonb,
  17.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/e2605c5c-50a9-41a3-a3f5-145ec9b22cd4-1779309159450.png', true , false , false , 0
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍗 Pollo Crispy'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "42. Hamburguesa con Huevo", "es": "42. Hamburguesa con Huevo", "fr": "42. Hamburguesa con Huevo", "pt": "42. Hamburguesa con Huevo"}'::jsonb,
  '{"en": "Carne de pollo o ternera, huevo, lechuga, queso, cebolla, col, tomate y salsa", "es": "Carne de pollo o ternera, huevo, lechuga, queso, cebolla, col, tomate y salsa", "fr": "Carne de pollo o ternera, huevo, lechuga, queso, cebolla, col, tomate y salsa", "pt": "Carne de pollo o ternera, huevo, lechuga, queso, cebolla, col, tomate y salsa"}'::jsonb,
  6.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/82f75fa4-a8ed-4a5e-b618-320b86730478-1779309191717.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍔 Burguer'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "22. Patatas Bravas", "es": "22. Patatas Bravas", "fr": "22. Patatas Bravas", "pt": "22. Patatas Bravas"}'::jsonb,
  '{"en": "Con salsa brava picante", "es": "Con salsa brava picante", "fr": "Con salsa brava picante", "pt": "Con salsa brava picante"}'::jsonb,
  2.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/dd51ad09-360e-41a2-84e6-d886b8192b16-1779309215530.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "32. Plato Mixto"}'::jsonb,
  '{"es": "Carne de pollo y ternera, ensalada, patatas fritas y salsa"}'::jsonb,
  7.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/8fe8e9af-3acd-483c-ac7c-bf0399ab4f7a-1780560861045.png', true , false , true , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍽️ Platos'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Combo 10 Piezas Pollo Crispy", "es": "Combo 10 Piezas Pollo Crispy", "fr": "Combo 10 Piezas Pollo Crispy", "pt": "Combo 10 Piezas Pollo Crispy"}'::jsonb,
  '{"en": "10 piezas pollo crispy + patatas fritas + bebida 2L (o bravas +1,50€)", "es": "10 piezas pollo crispy + patatas fritas + bebida 2L (o bravas +1,50€)", "fr": "10 piezas pollo crispy + patatas fritas + bebida 2L (o bravas +1,50€)", "pt": "10 piezas pollo crispy + patatas fritas + bebida 2L (o bravas +1,50€)"}'::jsonb,
  22.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/9a106720-a89b-47f1-995d-f855231b7ce8-1779375495183.png', true , false , true , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🔥 Ofertas Combo'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "1. Pan de Pita de Pollo", "es": "1. Pan de Pita de Pollo", "fr": "1. Pan de Pita de Pollo", "pt": "1. Pan de Pita de Pollo"}'::jsonb,
  '{"en": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas", "es": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas", "fr": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas", "pt": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas"}'::jsonb,
  4.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/022d07ad-debf-4fae-8ec0-0cfb0d8000fb-1779309162582.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥙 Pan Pita'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "2. Pan de Pita de Ternera", "es": "2. Pan de Pita de Ternera", "fr": "2. Pan de Pita de Ternera", "pt": "2. Pan de Pita de Ternera"}'::jsonb,
  '{"en": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas", "es": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas", "fr": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas", "pt": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas"}'::jsonb,
  4.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/a072dc7f-9b9b-4e7d-8010-6be130b5aa9a-1779309224679.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥙 Pan Pita'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "12. Rollo de Ternera", "es": "12. Rollo de Ternera", "fr": "12. Rollo de Ternera", "pt": "12. Rollo de Ternera"}'::jsonb,
  '{"en": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas", "es": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas", "fr": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas", "pt": "Carne de ternera, lechuga, cebolla, tomate, col, maíz y salsas"}'::jsonb,
  5.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/768664d0-80e3-4ba7-af85-4c2fa901fef7-1779309184865.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🌯 Rollo Kebab'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "43 M — Pollo Crispy 6ud", "es": "43 M — Pollo Crispy 6ud", "fr": "43 M — Pollo Crispy 6ud", "pt": "43 M — Pollo Crispy 6ud"}'::jsonb,
  '{"en": "6 piezas de pollo crispy", "es": "6 piezas de pollo crispy", "fr": "6 piezas de pollo crispy", "pt": "6 piezas de pollo crispy"}'::jsonb,
  11.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/e2605c5c-50a9-41a3-a3f5-145ec9b22cd4-1779309159450.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍗 Pollo Crispy'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "72. Ensalada de Atún", "es": "72. Ensalada de Atún", "fr": "72. Ensalada de Atún", "pt": "72. Ensalada de Atún"}'::jsonb,
  '{"en": "Atún, lechuga, tomate, cebolla y aceitunas", "es": "Atún, lechuga, tomate, cebolla y aceitunas", "fr": "Atún, lechuga, tomate, cebolla y aceitunas", "pt": "Atún, lechuga, tomate, cebolla y aceitunas"}'::jsonb,
  5.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/6f43e79f-a364-4fec-9bae-799cd800280c-1779309231963.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥗 Ensaladas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "80. Menú Aros de Cebolla", "es": "80. Menú Aros de Cebolla", "fr": "80. Menú Aros de Cebolla", "pt": "80. Menú Aros de Cebolla"}'::jsonb,
  '{"en": "Aros de cebolla + patatas fritas + lata 33cl", "es": "Aros de cebolla + patatas fritas + lata 33cl", "fr": "Aros de cebolla + patatas fritas + lata 33cl", "pt": "Aros de cebolla + patatas fritas + lata 33cl"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/c627270e-ccbb-4424-8704-cdeed9899e78-1779309239636.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "52. Pizza Kebab", "es": "52. Pizza Kebab", "fr": "52. Pizza Kebab", "pt": "52. Pizza Kebab"}'::jsonb,
  '{"en": "Pollo o ternera, tomate, mozzarella y orégano", "es": "Pollo o ternera, tomate, mozzarella y orégano", "fr": "Pollo o ternera, tomate, mozzarella y orégano", "pt": "Pollo o ternera, tomate, mozzarella y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/b1f08653-2217-4bf1-889b-2677e32bae60-1779309199750.png', true , false , true , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Agua Grande", "es": "Agua Grande", "fr": "Agua Grande", "pt": "Agua Grande"}'::jsonb,
  '{"en": "Botella de agua 1.5L", "es": "Botella de agua 1.5L", "fr": "Botella de agua 1.5L", "pt": "Botella de agua 1.5L"}'::jsonb,
  1.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/162b87d5-666c-4349-89cd-682f68aabebd-1779309207862.png', true , false , false , 1
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "44 S — Pollo Crispy 3ud", "es": "44 S — Pollo Crispy 3ud", "fr": "44 S — Pollo Crispy 3ud", "pt": "44 S — Pollo Crispy 3ud"}'::jsonb,
  '{"en": "3 piezas de pollo crispy", "es": "3 piezas de pollo crispy", "fr": "3 piezas de pollo crispy", "pt": "3 piezas de pollo crispy"}'::jsonb,
  6.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/e2605c5c-50a9-41a3-a3f5-145ec9b22cd4-1779309159450.png', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍗 Pollo Crispy'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Combo 4 Pan Pita Mixto", "es": "Combo 4 Pan Pita Mixto", "fr": "Combo 4 Pan Pita Mixto", "pt": "Combo 4 Pan Pita Mixto"}'::jsonb,
  '{"en": "4 pan pita mixto + patatas fritas + bebida 2L", "es": "4 pan pita mixto + patatas fritas + bebida 2L", "fr": "4 pan pita mixto + patatas fritas + bebida 2L", "pt": "4 pan pita mixto + patatas fritas + bebida 2L"}'::jsonb,
  21.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/1e4ca70a-9991-4044-b61d-0361ac4a0a7a-1779375520092.png', true , false , true , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🔥 Ofertas Combo'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "21. Patatas Fritas", "es": "21. Patatas Fritas", "fr": "21. Patatas Fritas", "pt": "21. Patatas Fritas"}'::jsonb,
  '{}'::jsonb,
  2.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/ec4058ab-6883-43bd-afee-1608d00d6951-1779309146847.png', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "33. Plato Carne con Patatas"}'::jsonb,
  '{"es": "Carne de pollo o ternera o mixto con patatas"}'::jsonb,
  7.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/593f9353-f52b-4c5f-b449-acf845a24d19-1780560891849.png', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍽️ Platos'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "23. Patatas de Lux", "es": "23. Patatas de Lux", "fr": "23. Patatas de Lux", "pt": "23. Patatas de Lux"}'::jsonb,
  '{"en": "Patatas estilo deluxe", "es": "Patatas estilo deluxe", "fr": "Patatas estilo deluxe", "pt": "Patatas estilo deluxe"}'::jsonb,
  2.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/7b744b87-e9ed-4bd6-9498-77827312acde-1779309149241.png', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "53. Pizza Kebab Mixta", "es": "53. Pizza Kebab Mixta", "fr": "53. Pizza Kebab Mixta", "pt": "53. Pizza Kebab Mixta"}'::jsonb,
  '{"en": "Pollo y ternera, tomate, mozzarella y orégano", "es": "Pollo y ternera, tomate, mozzarella y orégano", "fr": "Pollo y ternera, tomate, mozzarella y orégano", "pt": "Pollo y ternera, tomate, mozzarella y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/20ff4ac3-736f-4e76-8e2a-640cda7520ef-1779309152793.png', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "43. Hamburguesa Doble", "es": "43. Hamburguesa Doble", "fr": "43. Hamburguesa Doble", "pt": "43. Hamburguesa Doble"}'::jsonb,
  '{"en": "Doble carne, lechuga, queso, cebolla, col, tomate y salsa", "es": "Doble carne, lechuga, queso, cebolla, col, tomate y salsa", "fr": "Doble carne, lechuga, queso, cebolla, col, tomate y salsa", "pt": "Doble carne, lechuga, queso, cebolla, col, tomate y salsa"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/76b8c8a3-efbd-47d8-89f9-d3217383f8f1-1779309152566.png', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍔 Burguer'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "81. Menú Pan de Pita", "es": "81. Menú Pan de Pita", "fr": "81. Menú Pan de Pita", "pt": "81. Menú Pan de Pita"}'::jsonb,
  '{"en": "Kebab pan pita + patatas fritas + lata 33cl", "es": "Kebab pan pita + patatas fritas + lata 33cl", "fr": "Kebab pan pita + patatas fritas + lata 33cl", "pt": "Kebab pan pita + patatas fritas + lata 33cl"}'::jsonb,
  7.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/64d47dfa-135b-4ded-b478-2b7980a404f9-1780417203442.png', true , false , true , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "3. Pan de Pita Mixto", "es": "3. Pan de Pita Mixto", "fr": "3. Pan de Pita Mixto", "pt": "3. Pan de Pita Mixto"}'::jsonb,
  '{"en": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas", "es": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas", "fr": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas", "pt": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas"}'::jsonb,
  4.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/16ae821b-06fd-4b56-83f1-6c15a63f45c0-1779309146125.png', true , false , true , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥙 Pan Pita'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "13. Rollo Mixto", "es": "13. Rollo Mixto", "fr": "13. Rollo Mixto", "pt": "13. Rollo Mixto"}'::jsonb,
  '{"en": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas", "es": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas", "fr": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas", "pt": "Carne de pollo y ternera, lechuga, cebolla, col, tomate, maíz y salsas"}'::jsonb,
  5.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/ce23aa14-9f7b-4310-89d5-4580c0e5f5b5-1779309159779.png', true , false , true , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🌯 Rollo Kebab'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Zumo Bi Frutas"}'::jsonb,
  '{"es": "Zumo bi frutas"}'::jsonb,
  1.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/60a1065f-a8df-4fe1-adbc-4b594ad315e5-1780564120071.jpg', true , false , false , 2
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Combo 3 Pizzas Kebab", "es": "Combo 3 Pizzas Kebab", "fr": "Combo 3 Pizzas Kebab", "pt": "Combo 3 Pizzas Kebab"}'::jsonb,
  '{"en": "3 pizzas kebab + patatas fritas + bebida 2L", "es": "3 pizzas kebab + patatas fritas + bebida 2L", "fr": "3 pizzas kebab + patatas fritas + bebida 2L", "pt": "3 pizzas kebab + patatas fritas + bebida 2L"}'::jsonb,
  25.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/2e65b2e3-db56-4d7a-a1ee-8335eb932557-1779309164009.png', true , false , true , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🔥 Ofertas Combo'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "34. Plato con Arroz"}'::jsonb,
  '{"es": "Carne pollo o ternera, arroz, ensalada y salsa"}'::jsonb,
  8.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/8ec12847-5d2c-4dcc-b384-88838e2f4c20-1780561661583.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍽️ Platos'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "82. Menú Hamburguesa", "es": "82. Menú Hamburguesa", "fr": "82. Menú Hamburguesa", "pt": "82. Menú Hamburguesa"}'::jsonb,
  '{"en": "Hamburguesa pollo o ternera + patatas fritas + lata 33cl (con huevo +0,50€, doble +1,00€)", "es": "Hamburguesa pollo o ternera + patatas fritas + lata 33cl (con huevo +0,50€, doble +1,00€)", "fr": "Hamburguesa pollo o ternera + patatas fritas + lata 33cl (con huevo +0,50€, doble +1,00€)", "pt": "Hamburguesa pollo o ternera + patatas fritas + lata 33cl (con huevo +0,50€, doble +1,00€)"}'::jsonb,
  8.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/91ccb6e1-6f51-4b28-99c0-cedf6d2e1afd-1779309160572.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "4. Pan de Pita Vegetal", "es": "4. Pan de Pita Vegetal", "fr": "4. Pan de Pita Vegetal", "pt": "4. Pan de Pita Vegetal"}'::jsonb,
  '{"en": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas", "es": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas", "fr": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas", "pt": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas"}'::jsonb,
  4.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/d49fdaf1-27df-49ce-a3f5-7f67083e4db5-1779309167127.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥙 Pan Pita'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "14. Rollo Vegetal", "es": "14. Rollo Vegetal", "fr": "14. Rollo Vegetal", "pt": "14. Rollo Vegetal"}'::jsonb,
  '{"en": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas", "es": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas", "fr": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas", "pt": "Falafel, lechuga, cebolla, tomate, col, maíz y salsas"}'::jsonb,
  4.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/dbdaed1f-8c01-47f1-9e5d-1abd7f3bb5bd-1779309166658.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🌯 Rollo Kebab'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "24. Patatas con Queso", "es": "24. Patatas con Queso", "fr": "24. Patatas con Queso", "pt": "24. Patatas con Queso"}'::jsonb,
  '{"en": "Patatas con queso fundido", "es": "Patatas con queso fundido", "fr": "Patatas con queso fundido", "pt": "Patatas con queso fundido"}'::jsonb,
  5.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/7e8c6a0b-b5b9-42a2-9d16-eff507735f0a-1780417285793.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "11. Rollo de Pollo", "es": "11. Rollo de Pollo", "fr": "11. Rollo de Pollo", "pt": "11. Rollo de Pollo"}'::jsonb,
  '{"en": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas", "es": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas", "fr": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas", "pt": "Carne de pollo, lechuga, cebolla, tomate, col, maíz y salsas"}'::jsonb,
  5.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/76881fa0-b8c2-473c-83ae-c7699adef541-1779309154434.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🌯 Rollo Kebab'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "54. Pizza Hawaiana", "es": "54. Pizza Hawaiana", "fr": "54. Pizza Hawaiana", "pt": "54. Pizza Hawaiana"}'::jsonb,
  '{"en": "Pavo, tomate, piña, mozzarella y orégano", "es": "Pavo, tomate, piña, mozzarella y orégano", "fr": "Pavo, tomate, piña, mozzarella y orégano", "pt": "Pavo, tomate, piña, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/673b25e9-ea5c-4851-9c2c-58674e990bcc-1779309165479.png', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Refresco Lata 33cl"}'::jsonb,
  '{"es": "Coca-Cola, Fanta, Sprite, Nestea"}'::jsonb,
  1.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/fd69483b-4db3-4e42-95fd-1de57bf667cf-1780564157454.webp', true , false , false , 3
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Aquarius / Nestea 33cl"}'::jsonb,
  '{"es": "Aquarius o Nestea lata 33cl"}'::jsonb,
  2.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/f1aeb7d6-cc9b-4bbe-9d76-c0e9d0d2e002-1780564144155.webp', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "15. Rollo Solo Carne", "es": "15. Rollo Solo Carne", "fr": "15. Rollo Solo Carne", "pt": "15. Rollo Solo Carne"}'::jsonb,
  '{"en": "Pollo o ternera y salsas", "es": "Pollo o ternera y salsas", "fr": "Pollo o ternera y salsas", "pt": "Pollo o ternera y salsas"}'::jsonb,
  6.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/69ef0e6b-0b0d-40b1-b34f-9fd9f039039d-1779309174763.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🌯 Rollo Kebab'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "5. Pan de Pita Solo Carne", "es": "5. Pan de Pita Solo Carne", "fr": "5. Pan de Pita Solo Carne", "pt": "5. Pan de Pita Solo Carne"}'::jsonb,
  '{"en": "Carne de pollo o ternera y salsas", "es": "Carne de pollo o ternera y salsas", "fr": "Carne de pollo o ternera y salsas", "pt": "Carne de pollo o ternera y salsas"}'::jsonb,
  5.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/0a468982-e3db-43fe-8824-78246f72f039-1779309173799.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥙 Pan Pita'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Agua Pequeña", "es": "Agua Pequeña", "fr": "Agua Pequeña", "pt": "Agua Pequeña"}'::jsonb,
  '{"en": "Botella de agua 50cl", "es": "Botella de agua 50cl", "fr": "Botella de agua 50cl", "pt": "Botella de agua 50cl"}'::jsonb,
  1.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/9020d86d-d440-41a1-a96b-e9dc9fbe895e-1780417242952.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "55. Pizza Atún", "es": "55. Pizza Atún", "fr": "55. Pizza Atún", "pt": "55. Pizza Atún"}'::jsonb,
  '{"en": "Atún, tomate, cebolla, mozzarella y orégano", "es": "Atún, tomate, cebolla, mozzarella y orégano", "fr": "Atún, tomate, cebolla, mozzarella y orégano", "pt": "Atún, tomate, cebolla, mozzarella y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/6fa31179-7dda-4d38-8d1b-c271fb01e9a3-1779309177947.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Combo 4 Rollos Kebab", "es": "Combo 4 Rollos Kebab", "fr": "Combo 4 Rollos Kebab", "pt": "Combo 4 Rollos Kebab"}'::jsonb,
  '{"en": "4 rollos kebab + patatas fritas + bebida 2L", "es": "4 rollos kebab + patatas fritas + bebida 2L", "fr": "4 rollos kebab + patatas fritas + bebida 2L", "pt": "4 rollos kebab + patatas fritas + bebida 2L"}'::jsonb,
  24.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/5f6a1ed5-d620-4be5-b417-a6f7937a8fd8-1779309171465.png', true , false , true , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🔥 Ofertas Combo'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "35. Plato Solo Carne"}'::jsonb,
  '{"es": "Carne de pollo o ternera o mixto"}'::jsonb,
  9.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/148a4630-f7ab-4812-941e-ccbab77c7a33-1780562350713.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍽️ Platos'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "25A. Box con Verdura", "es": "25A. Box con Verdura", "fr": "25A. Box con Verdura", "pt": "25A. Box con Verdura"}'::jsonb,
  '{"en": "Carne, verduras, patatas y salsa", "es": "Carne, verduras, patatas y salsa", "fr": "Carne, verduras, patatas y salsa", "pt": "Carne, verduras, patatas y salsa"}'::jsonb,
  4.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/fe4e6c72-225e-49b9-86c8-fcf15ebca78b-1779309175222.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "83. Menú Nuggets", "es": "83. Menú Nuggets", "fr": "83. Menú Nuggets", "pt": "83. Menú Nuggets"}'::jsonb,
  '{"en": "6 nuggets + patatas fritas + lata 33cl", "es": "6 nuggets + patatas fritas + lata 33cl", "fr": "6 nuggets + patatas fritas + lata 33cl", "pt": "6 nuggets + patatas fritas + lata 33cl"}'::jsonb,
  6.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/e17bfc08-a5b4-456f-aa73-7d2c9c7030ad-1780417337258.png', true , false , false , 4
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "71. Ensalada de la Casa", "es": "71. Ensalada de la Casa", "fr": "71. Ensalada de la Casa", "pt": "71. Ensalada de la Casa"}'::jsonb,
  '{"en": "Lechuga, tomate, col, maíz, cebolla y zanahoria", "es": "Lechuga, tomate, col, maíz, cebolla y zanahoria", "fr": "Lechuga, tomate, col, maíz, cebolla y zanahoria", "pt": "Lechuga, tomate, col, maíz, cebolla y zanahoria"}'::jsonb,
  4.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/1987257c-1290-4844-87f3-139d59105c82-1779309130845.png', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥗 Ensaladas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Refresco Botella 1.25L"}'::jsonb,
  '{"es": "Coca-Cola, Fanta o similar"}'::jsonb,
  2.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/1d0d64c4-44ef-4407-b2ec-f6f243f2ee19-1780564508160.jpg', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "84. Menú Alitas de Pollo", "es": "84. Menú Alitas de Pollo", "fr": "84. Menú Alitas de Pollo", "pt": "84. Menú Alitas de Pollo"}'::jsonb,
  '{"en": "Alitas de pollo + patatas fritas + lata 33cl", "es": "Alitas de pollo + patatas fritas + lata 33cl", "fr": "Alitas de pollo + patatas fritas + lata 33cl", "pt": "Alitas de pollo + patatas fritas + lata 33cl"}'::jsonb,
  7.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/190e618b-367c-47c7-97d1-c0d5c6a5cf7e-1780417346483.png', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "16. Rollo Especial", "es": "16. Rollo Especial", "fr": "16. Rollo Especial", "pt": "16. Rollo Especial"}'::jsonb,
  '{"en": "Pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas", "es": "Pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas", "fr": "Pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas", "pt": "Pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas"}'::jsonb,
  6.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/88109f03-5ae4-48c2-8983-97bfa6e4e5aa-1779309185146.png', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🌯 Rollo Kebab'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "6. Pan de Pita Especial", "es": "6. Pan de Pita Especial", "fr": "6. Pan de Pita Especial", "pt": "6. Pan de Pita Especial"}'::jsonb,
  '{"en": "Carne de pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas", "es": "Carne de pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas", "fr": "Carne de pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas", "pt": "Carne de pollo o ternera, lechuga, cebolla, tomate, maíz, queso feta, col, mozzarella y salsas"}'::jsonb,
  5.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/ab21dcab-bd62-43e0-96f1-0bef94abc083-1779309182261.png', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥙 Pan Pita'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "56. Pizza Vegetal", "es": "56. Pizza Vegetal", "fr": "56. Pizza Vegetal", "pt": "56. Pizza Vegetal"}'::jsonb,
  '{"en": "Tomate, mozzarella, cebolla, champiñón, pimientos, maíz, aceitunas y orégano", "es": "Tomate, mozzarella, cebolla, champiñón, pimientos, maíz, aceitunas y orégano", "fr": "Tomate, mozzarella, cebolla, champiñón, pimientos, maíz, aceitunas y orégano", "pt": "Tomate, mozzarella, cebolla, champiñón, pimientos, maíz, aceitunas y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/afd99923-9be6-4da2-9837-4e9f0dcf5155-1779309179069.png', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "25B. Box Solo Carne", "es": "25B. Box Solo Carne", "fr": "25B. Box Solo Carne", "pt": "25B. Box Solo Carne"}'::jsonb,
  '{"en": "Carne, patatas y salsa", "es": "Carne, patatas y salsa", "fr": "Carne, patatas y salsa", "pt": "Carne, patatas y salsa"}'::jsonb,
  5.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/30b950ae-9dee-4b7f-91bb-058004847941-1779309181805.png', true , false , false , 5
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "57. Pizza Cuatro Quesos", "es": "57. Pizza Cuatro Quesos", "fr": "57. Pizza Cuatro Quesos", "pt": "57. Pizza Cuatro Quesos"}'::jsonb,
  '{"en": "Queso especial, tomate y orégano", "es": "Queso especial, tomate y orégano", "fr": "Queso especial, tomate y orégano", "pt": "Queso especial, tomate y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/6316f651-5027-446a-ad41-828f465851a1-1779309189242.png', true , false , false , 6
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "31. Plato Vegetal"}'::jsonb,
  '{"es": "Falafel, patatas fritas, ensalada y salsa"}'::jsonb,
  6.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/5ecf6028-bf6b-4fad-9544-89e21699c550-1780562489114.png', true , false , false , 6
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍽️ Platos'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "26. Patatas con Carne Kebab", "es": "26. Patatas con Carne Kebab", "fr": "26. Patatas con Carne Kebab", "pt": "26. Patatas con Carne Kebab"}'::jsonb,
  '{"en": "Patatas con carne kebab", "es": "Patatas con carne kebab", "fr": "Patatas con carne kebab", "pt": "Patatas con carne kebab"}'::jsonb,
  5.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/6dea8fd8-9356-4191-86f7-7dda2c2e371e-1780417294260.png', true , false , false , 6
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Refresco Botella 2L"}'::jsonb,
  '{"es": "Coca-Cola, Fanta o similar"}'::jsonb,
  3.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/298b0f63-2f50-463a-a2a9-5482dbffbc37-1780564287987.jpg', true , false , false , 6
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "85A. Menú Box con Verdura"}'::jsonb,
  '{"es": "Box + patatas fritas + lata 33cl"}'::jsonb,
  6.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/33b6e13a-5a12-44f0-8bec-6c701796b8a7-1780560558428.png', true , false , false , 6
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "58. Pizza Barbacoa", "es": "58. Pizza Barbacoa", "fr": "58. Pizza Barbacoa", "pt": "58. Pizza Barbacoa"}'::jsonb,
  '{"en": "Ternera, salsa barbacoa, tomate, mozzarella y orégano", "es": "Ternera, salsa barbacoa, tomate, mozzarella y orégano", "fr": "Ternera, salsa barbacoa, tomate, mozzarella y orégano", "pt": "Ternera, salsa barbacoa, tomate, mozzarella y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/5ed1c390-5ffc-4ad1-9adb-1a630fdae578-1779309194630.png', true , false , false , 7
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "51. Pizza Margarita", "es": "51. Pizza Margarita", "fr": "51. Pizza Margarita", "pt": "51. Pizza Margarita"}'::jsonb,
  '{"en": "Tomate, mozzarella y orégano", "es": "Tomate, mozzarella y orégano", "fr": "Tomate, mozzarella y orégano", "pt": "Tomate, mozzarella y orégano"}'::jsonb,
  6.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/6f78a076-9d1f-4b63-b987-faeaa0aa1f88-1779309112979.png', true , false , false , 7
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "27. Aros de Cebolla", "es": "27. Aros de Cebolla", "fr": "27. Aros de Cebolla", "pt": "27. Aros de Cebolla"}'::jsonb,
  '{}'::jsonb,
  4.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/3543a824-3178-48de-93be-dfbb7450d73a-1779309465015.png', true , false , false , 7
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "85B. Menú Box Solo Carne"}'::jsonb,
  '{"es": "Box + patatas fritas + lata 33cl"}'::jsonb,
  7.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/a53b65b8-be7c-43ae-a279-2c2e935c107a-1780560582676.png', true , false , false , 7
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "79. Menú Calamares", "es": "79. Menú Calamares", "fr": "79. Menú Calamares", "pt": "79. Menú Calamares"}'::jsonb,
  '{"en": "Calamares + patatas fritas + lata 33cl", "es": "Calamares + patatas fritas + lata 33cl", "fr": "Calamares + patatas fritas + lata 33cl", "pt": "Calamares + patatas fritas + lata 33cl"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/c61a939e-9025-4a2c-81ab-ff55a5b2d6ba-1779309170179.png', true , false , false , 8
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "86. Menú Rollo", "es": "86. Menú Rollo", "fr": "86. Menú Rollo", "pt": "86. Menú Rollo"}'::jsonb,
  '{"en": "Rollo kebab + patatas fritas + lata 33cl", "es": "Rollo kebab + patatas fritas + lata 33cl", "fr": "Rollo kebab + patatas fritas + lata 33cl", "pt": "Rollo kebab + patatas fritas + lata 33cl"}'::jsonb,
  8.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/5b2c7d77-ba2b-43e6-b5e6-2164704af1fc-1780417234411.png', true , false , false , 8
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Toro Loco Grande"}'::jsonb,
  '{"es": "Bebida energética grande"}'::jsonb,
  1.80,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/80992723-36e8-4b75-9f5c-51a4c861aa16-1780564189672.webp', true , false , false , 8
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "28. Calamares", "es": "28. Calamares", "fr": "28. Calamares", "pt": "28. Calamares"}'::jsonb,
  '{"en": "Calamares a la romana", "es": "Calamares a la romana", "fr": "Calamares a la romana", "pt": "Calamares a la romana"}'::jsonb,
  4.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/c18e9bed-c797-4e35-99b2-dceb7ea555ea-1780417302495.png', true , false , false , 8
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍟 Patatas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "59. Pizza Gandia", "es": "59. Pizza Gandia", "fr": "59. Pizza Gandia", "pt": "59. Pizza Gandia"}'::jsonb,
  '{"en": "Pollo o ternera, cebolla, tomate, mozzarella y orégano", "es": "Pollo o ternera, cebolla, tomate, mozzarella y orégano", "fr": "Pollo o ternera, cebolla, tomate, mozzarella y orégano", "pt": "Pollo o ternera, cebolla, tomate, mozzarella y orégano"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/1cc3be87-10b4-4f3a-b32a-f0e3b79256b4-1779309199741.png', true , false , false , 8
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "87. Menú Plato Combinado"}'::jsonb,
  '{"es": "Plato combinado + patatas + lata 33cl + pan"}'::jsonb,
  9.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/70e72496-fe8c-4fe7-9bb9-611d80a35664-1780562902195.png', true , false , false , 9
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "29. Durum al Horno", "es": "29. Durum al Horno", "fr": "29. Durum al Horno", "pt": "29. Durum al Horno"}'::jsonb,
  '{"en": "Durum al horno con verduras", "es": "Durum al horno con verduras", "fr": "Durum al horno con verduras", "pt": "Durum al horno con verduras"}'::jsonb,
  6.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/548082ba-2121-453a-81ca-f73b5f06c38f-1779309206549.png', true , false , false , 9
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = 'Durum'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "41. Hamburguesa Normal", "es": "41. Hamburguesa Normal", "fr": "41. Hamburguesa Normal", "pt": "41. Hamburguesa Normal"}'::jsonb,
  '{"en": "Carne de pollo o ternera, lechuga, queso, cebolla, col, tomate y salsa", "es": "Carne de pollo o ternera, lechuga, queso, cebolla, col, tomate y salsa", "fr": "Carne de pollo o ternera, lechuga, queso, cebolla, col, tomate y salsa", "pt": "Carne de pollo o ternera, lechuga, queso, cebolla, col, tomate y salsa"}'::jsonb,
  5.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/41cee370-c6a3-44eb-b8c1-ed4295adff30-1779309177086.png', true , false , false , 9
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍔 Burguer'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Monster Grande"}'::jsonb,
  '{"es": "Bebida energética grande"}'::jsonb,
  2.20,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/9a337488-d06f-4c0c-a10b-32c97f2d9250-1780564178739.webp', true , false , false , 9
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "60. Pizza Marinera", "es": "60. Pizza Marinera", "fr": "60. Pizza Marinera", "pt": "60. Pizza Marinera"}'::jsonb,
  '{"en": "Gambas, atún, tomate, mozzarella y orégano", "es": "Gambas, atún, tomate, mozzarella y orégano", "fr": "Gambas, atún, tomate, mozzarella y orégano", "pt": "Gambas, atún, tomate, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/32822d4d-61f6-497c-9f2f-0eefd0e2f27b-1779309201251.png', true , false , false , 9
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Zumo Enjoy 50cl"}'::jsonb,
  '{"es": "Zumo natural Enjoy 50cl"}'::jsonb,
  1.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/68a89243-1402-4aa1-9cad-ee174545c13e-1780564206137.webp', true , false , false , 10
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Combo 4 Piezas Pollo Crispy", "es": "Combo 4 Piezas Pollo Crispy", "fr": "Combo 4 Piezas Pollo Crispy", "pt": "Combo 4 Piezas Pollo Crispy"}'::jsonb,
  '{"en": "4 piezas pollo crispy + patatas fritas + refresco 33cl", "es": "4 piezas pollo crispy + patatas fritas + refresco 33cl", "fr": "4 piezas pollo crispy + patatas fritas + refresco 33cl", "pt": "4 piezas pollo crispy + patatas fritas + refresco 33cl"}'::jsonb,
  10.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/0d369a7b-7cca-4a7a-8466-c9958fdfeaf8-1779309138223.png', true , false , true , 10
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🔥 Ofertas Combo'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "88. Menú Durum al Horno"}'::jsonb,
  '{"es": "Durum al horno + patatas fritas + lata 33cl (solo carne +1,00€)"}'::jsonb,
  8.50,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/1d565cf0-572c-4984-aace-2d672bb9650e-1780560629679.png', true , false , false , 10
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = 'Durum'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "29B. Durum al Horno Solo Carne", "es": "29B. Durum al Horno Solo Carne", "fr": "29B. Durum al Horno Solo Carne", "pt": "29B. Durum al Horno Solo Carne"}'::jsonb,
  '{"en": "Durum al horno solo carne", "es": "Durum al horno solo carne", "fr": "Durum al horno solo carne", "pt": "Durum al horno solo carne"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/a0a12493-35bb-408a-8110-6f80191e4d66-1779309210004.png', true , false , false , 10
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = 'Durum'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "61. Pizza Especial de la Casa", "es": "61. Pizza Especial de la Casa", "fr": "61. Pizza Especial de la Casa", "pt": "61. Pizza Especial de la Casa"}'::jsonb,
  '{"en": "Carne mixta, tomate, cebolla, pimiento, maíz, mozzarella y orégano", "es": "Carne mixta, tomate, cebolla, pimiento, maíz, mozzarella y orégano", "fr": "Carne mixta, tomate, cebolla, pimiento, maíz, mozzarella y orégano", "pt": "Carne mixta, tomate, cebolla, pimiento, maíz, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/6255f82c-92a3-4095-9fb2-10feeb1e75de-1779309207352.png', true , false , true , 10
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "62. Pizza Tropical", "es": "62. Pizza Tropical", "fr": "62. Pizza Tropical", "pt": "62. Pizza Tropical"}'::jsonb,
  '{"en": "Pollo o ternera, piña, tomate, mozzarella y orégano", "es": "Pollo o ternera, piña, tomate, mozzarella y orégano", "fr": "Pollo o ternera, piña, tomate, mozzarella y orégano", "pt": "Pollo o ternera, piña, tomate, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/25aa52f1-34bb-4137-9dac-24fd90344c01-1779309218180.png', true , false , false , 11
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "89. Menú Plato Kapsalon", "es": "89. Menú Plato Kapsalon", "fr": "89. Menú Plato Kapsalon", "pt": "89. Menú Plato Kapsalon"}'::jsonb,
  '{"en": "Kapsalon + patatas fritas + lata 33cl (solo carne +1,00€)", "es": "Kapsalon + patatas fritas + lata 33cl (solo carne +1,00€)", "fr": "Kapsalon + patatas fritas + lata 33cl (solo carne +1,00€)", "pt": "Kapsalon + patatas fritas + lata 33cl (solo carne +1,00€)"}'::jsonb,
  8.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/7cf43667-ee87-41e8-b5f5-91abd16052d8-1779309379295.png', true , false , false , 11
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = 'Kapsalon'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "30. Kapsalon", "es": "30. Kapsalon", "fr": "30. Kapsalon", "pt": "30. Kapsalon"}'::jsonb,
  '{"en": "Kapsalon con verduras y queso fundido", "es": "Kapsalon con verduras y queso fundido", "fr": "Kapsalon con verduras y queso fundido", "pt": "Kapsalon con verduras y queso fundido"}'::jsonb,
  6.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/7b2853e5-ad7d-4253-a85c-fb55a6a2ae38-1779309214485.png', true , false , false , 11
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = 'Kapsalon'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "90. Menú Pizza Kebab", "es": "90. Menú Pizza Kebab", "fr": "90. Menú Pizza Kebab", "pt": "90. Menú Pizza Kebab"}'::jsonb,
  '{"en": "Pizza kebab + patatas fritas + lata 33cl", "es": "Pizza kebab + patatas fritas + lata 33cl", "fr": "Pizza kebab + patatas fritas + lata 33cl", "pt": "Pizza kebab + patatas fritas + lata 33cl"}'::jsonb,
  10.00,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/ca4789ae-9d6b-4c67-8899-29054acf6cbb-1780417362504.png', true , false , true , 12
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "63. Pizza Champiñones", "es": "63. Pizza Champiñones", "fr": "63. Pizza Champiñones", "pt": "63. Pizza Champiñones"}'::jsonb,
  '{"en": "Pavo, champiñones, tomate, aceitunas, mozzarella y orégano", "es": "Pavo, champiñones, tomate, aceitunas, mozzarella y orégano", "fr": "Pavo, champiñones, tomate, aceitunas, mozzarella y orégano", "pt": "Pavo, champiñones, tomate, aceitunas, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/5f30f0be-5443-45c8-a703-732d3aaf801b-1779309219313.png', true , false , false , 12
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "30B. Kapsalon Solo Carne", "es": "30B. Kapsalon Solo Carne", "fr": "30B. Kapsalon Solo Carne", "pt": "30B. Kapsalon Solo Carne"}'::jsonb,
  '{"en": "Kapsalon solo carne con queso fundido", "es": "Kapsalon solo carne con queso fundido", "fr": "Kapsalon solo carne con queso fundido", "pt": "Kapsalon solo carne con queso fundido"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/b24408de-0a5a-40fb-9562-631d9e1e887f-1779309223254.png', true , false , false , 12
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = 'Kapsalon'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "91. Menú Escalope Pollo", "es": "91. Menú Escalope Pollo", "fr": "91. Menú Escalope Pollo", "pt": "91. Menú Escalope Pollo"}'::jsonb,
  '{"en": "4 escalopes de pollo + patatas fritas + lata 33cl", "es": "4 escalopes de pollo + patatas fritas + lata 33cl", "fr": "4 escalopes de pollo + patatas fritas + lata 33cl", "pt": "4 escalopes de pollo + patatas fritas + lata 33cl"}'::jsonb,
  7.00,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/63870464-9b50-4c0e-8f7b-5eb69092d763-1779309225686.png', true , false , false , 13
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Menús'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "64. Pizza Calzone", "es": "64. Pizza Calzone", "fr": "64. Pizza Calzone", "pt": "64. Pizza Calzone"}'::jsonb,
  '{"en": "Pollo o ternera, cebolla, champiñón, patatas, tomate, mozzarella y orégano", "es": "Pollo o ternera, cebolla, champiñón, patatas, tomate, mozzarella y orégano", "fr": "Pollo o ternera, cebolla, champiñón, patatas, tomate, mozzarella y orégano", "pt": "Pollo o ternera, cebolla, champiñón, patatas, tomate, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/021f0d18-dccd-4d5d-9762-f74f7cff572c-1779309227307.png', true , false , false , 13
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "65. Pizza Valencia", "es": "65. Pizza Valencia", "fr": "65. Pizza Valencia", "pt": "65. Pizza Valencia"}'::jsonb,
  '{"en": "Pollo o ternera, patata, salsa barbacoa, tomate, mozzarella y orégano", "es": "Pollo o ternera, patata, salsa barbacoa, tomate, mozzarella y orégano", "fr": "Pollo o ternera, patata, salsa barbacoa, tomate, mozzarella y orégano", "pt": "Pollo o ternera, patata, salsa barbacoa, tomate, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/4e2340aa-93b0-4acf-9616-16f469d540ce-1779309230452.png', true , false , false , 14
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "66. Pizza Carbonara", "es": "66. Pizza Carbonara", "fr": "66. Pizza Carbonara", "pt": "66. Pizza Carbonara"}'::jsonb,
  '{"en": "Pollo o pavo o ternera, champiñón, nata, huevo, mozzarella y orégano", "es": "Pollo o pavo o ternera, champiñón, nata, huevo, mozzarella y orégano", "fr": "Pollo o pavo o ternera, champiñón, nata, huevo, mozzarella y orégano", "pt": "Pollo o pavo o ternera, champiñón, nata, huevo, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/0c643c7b-42fb-4363-9dcf-3767f8752a5c-1779309234155.png', true , false , false , 15
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "67. Pizza Salami", "es": "67. Pizza Salami", "fr": "67. Pizza Salami", "pt": "67. Pizza Salami"}'::jsonb,
  '{"en": "Salami, tomate, mozzarella y orégano", "es": "Salami, tomate, mozzarella y orégano", "fr": "Salami, tomate, mozzarella y orégano", "pt": "Salami, tomate, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/12cb1ac6-6992-4e29-8d18-55a1742e93bb-1779309235156.png', true , false , false , 16
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "68. Pizza Pepperoni", "es": "68. Pizza Pepperoni", "fr": "68. Pizza Pepperoni", "pt": "68. Pizza Pepperoni"}'::jsonb,
  '{"en": "Pepperoni, tomate, mozzarella y orégano", "es": "Pepperoni, tomate, mozzarella y orégano", "fr": "Pepperoni, tomate, mozzarella y orégano", "pt": "Pepperoni, tomate, mozzarella y orégano"}'::jsonb,
  7.50,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/354fa768-4345-46b2-9ee7-bb28b1f78cd0/16e6a4f6-39b1-49c0-aa73-6d00356b2501-1779309237857.png', true , false , false , 17
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🍕 Pizzas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Coca-Cola Can 33cl", "es": "Coca-Cola Lata 33cl", "fr": "Coca-Cola Canette 33cl", "pt": "Coca-Cola Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl", "pt": "Lata 33cl"}'::jsonb,
  1.80,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/elrey/beb-cocacola.png', true , false , false , 100
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Coca-Cola Zero Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl"}'::jsonb,
  1.80,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/545ce820-9a2a-4f5a-b92a-3be99a91dbd2-1780564106816.webp', true , false , false , 101
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Fanta Orange Can 33cl", "es": "Fanta Naranja Lata 33cl", "fr": "Fanta Orange Canette 33cl", "pt": "Fanta Naranja Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl", "pt": "Lata 33cl"}'::jsonb,
  1.80,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/elrey/beb-fanta-naranja.png', true , false , false , 102
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Fanta Lemon Can 33cl", "es": "Fanta Limón Lata 33cl", "fr": "Fanta Citron Canette 33cl", "pt": "Fanta Limón Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl", "pt": "Lata 33cl"}'::jsonb,
  1.80,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/elrey/beb-fanta-limon.png', true , false , false , 103
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Sprite Can 33cl", "es": "Sprite Lata 33cl", "fr": "Sprite Canette 33cl", "pt": "Sprite Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl", "pt": "Lata 33cl"}'::jsonb,
  1.80,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/elrey/beb-sprite.png', true , false , false , 104
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Nestea Can 33cl", "es": "Nestea Lata 33cl", "fr": "Nestea Canette 33cl", "pt": "Nestea Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl", "pt": "Lata 33cl"}'::jsonb,
  1.80,
  'https://wcbxxyeouzfoszfqowfd.supabase.co/storage/v1/object/public/products/elrey/beb-nestea.png', true , false , false , 105
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"es": "Aquarius Lata 33cl"}'::jsonb,
  '{"es": "Lata 33cl"}'::jsonb,
  1.80,
  'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/products/22222222-2222-2222-2222-222222222222/3f3df7fa-b623-4dad-aa7d-cfc0846f5d2f-1780563332473.webp', true , false , false , 106
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Coca-Cola 2L", "es": "Coca-Cola 2L", "fr": "Coca-Cola 2L", "pt": "Coca-Cola 2L"}'::jsonb,
  '{"en": "", "es": "", "fr": "", "pt": ""}'::jsonb,
  3.00,
  NULL, true , false , false , 107
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.products (
  store_id, category_id, name, description, price, image_url,
  is_active, is_bestseller, is_promo, sort_order
)
SELECT
  '22222222-2222-2222-2222-222222222222',
  cat.id,
  '{"en": "Fanta Naranja 2L", "es": "Fanta Naranja 2L", "fr": "Fanta Naranja 2L", "pt": "Fanta Naranja 2L"}'::jsonb,
  '{"en": "", "es": "", "fr": "", "pt": ""}'::jsonb,
  3.00,
  NULL, true , false , false , 108
FROM public.categories cat
WHERE cat.store_id = '22222222-2222-2222-2222-222222222222'
  AND cat.name->>'es' = '🥤 Bebidas'
LIMIT 1;

INSERT INTO public.promo_banners (store_id, image_url, video_url, media_type, link_url, video_autoplay, video_muted, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/branding/22222222-2222-2222-2222-222222222222/banner-1780593724142.png', NULL, 'image', NULL, true , true , true , 0);

INSERT INTO public.promo_banners (store_id, image_url, video_url, media_type, link_url, video_autoplay, video_muted, is_active, sort_order) VALUES ('22222222-2222-2222-2222-222222222222', NULL, 'https://kvpssbhclafoymhecmuk.supabase.co/storage/v1/object/public/branding/22222222-2222-2222-2222-222222222222/banner-video-1780598919898.mov', 'video', NULL, true , true , true , 1);