ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS logo_main_dark_url text,
  ADD COLUMN IF NOT EXISTS logo_secondary_dark_url text,
  ADD COLUMN IF NOT EXISTS logo_language_dark_url text,
  ADD COLUMN IF NOT EXISTS logo_order_type_dark_url text;