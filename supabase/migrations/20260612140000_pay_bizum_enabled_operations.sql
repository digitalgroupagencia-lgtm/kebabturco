-- Toggle Bizum no checkout (admin /admin/operations e painel da loja).
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS pay_bizum_enabled boolean NOT NULL DEFAULT true;

UPDATE public.operations_settings
SET pay_bizum_enabled = true
WHERE pay_bizum_enabled IS DISTINCT FROM true;
