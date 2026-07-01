-- Persiste aprovações da auditoria do cardápio (bebidas/combos) por produto.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_review_ok boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.catalog_review_ok IS
  'Quando true, o produto deixa de aparecer na fila «a rever» da auditoria do cardápio.';
