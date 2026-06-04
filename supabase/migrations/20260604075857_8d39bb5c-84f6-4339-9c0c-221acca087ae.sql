ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS combo_unit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS after_add_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;