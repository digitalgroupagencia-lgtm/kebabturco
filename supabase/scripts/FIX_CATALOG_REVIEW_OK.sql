-- Corrige fila «produtos a rever» que voltava sempre (aprovações agora ficam guardadas por produto).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_review_ok boolean NOT NULL DEFAULT false;
