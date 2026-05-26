-- Kebab Turco: garantir product_type / combo_unit_count nos combos e menús
-- (colunas criadas em 20260530120000_modifier_system.sql)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS combo_unit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_label jsonb DEFAULT '{"es":"Unidad","pt":"Unidade","en":"Unit","fr":"Unité"}'::jsonb;

-- Combos Ofertas (multi-unidade ou fechados)
UPDATE public.products p
SET
  product_type = 'combo',
  combo_unit_count = CASE
    WHEN p.name->>'es' ~* 'Combo 4 Pan Pita' THEN 4
    WHEN p.name->>'es' ~* 'Combo 4 Rollos' THEN 4
    WHEN p.name->>'es' ~* 'Combo 3 Pizzas' THEN 3
    WHEN p.name->>'es' ~* 'Combo 10 Piezas' THEN 0
    WHEN p.name->>'es' ~* 'Combo 4 Piezas' THEN 0
    ELSE combo_unit_count
  END,
  unit_label = CASE
    WHEN p.name->>'es' ~* 'Combo 4 Pan Pita' THEN '{"es":"Pan pita","pt":"Pan pita","en":"Pan pita","fr":"Pan pita"}'::jsonb
    WHEN p.name->>'es' ~* 'Combo 4 Rollos' THEN '{"es":"Rollo","pt":"Rollo","en":"Roll","fr":"Roulé"}'::jsonb
    WHEN p.name->>'es' ~* 'Combo 3 Pizzas' THEN '{"es":"Pizza","pt":"Pizza","en":"Pizza","fr":"Pizza"}'::jsonb
    ELSE unit_label
  END
WHERE p.store_id = '22222222-2222-2222-2222-222222222222'
  AND p.name->>'es' ~* '^Combo ';

-- Menús (combo fechado com bebida)
UPDATE public.products p
SET product_type = 'combo', combo_unit_count = 0
WHERE p.store_id = '22222222-2222-2222-2222-222222222222'
  AND (p.name->>'es' ~* '^Menú ' OR p.name->>'es' ~* '^Menu ');
