-- Correr na Lovable: Cloud → Base de dados → SQL (uma vez)
-- Corrige o erro ao Guardar Bizum em Admin → Pagos

ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS pay_bizum_enabled boolean NOT NULL DEFAULT true;

UPDATE public.operations_settings
SET pay_bizum_enabled = true, pay_card_enabled = true, updated_at = now()
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid;
