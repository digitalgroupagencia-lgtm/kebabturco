ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS after_add_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.after_add_suggestions IS
  'Lista de product_id sugeridos após adicionar este produto ao carrinho.';
