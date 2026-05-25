-- Fase 1: branding por domínio (plataforma SnapOrder + tenants)

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS theme_color text DEFAULT '#CC0000',
  ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#CC0000',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS icon_192_url text,
  ADD COLUMN IF NOT EXISTS icon_512_url text,
  ADD COLUMN IF NOT EXISTS apple_touch_icon_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

UPDATE public.platform_settings
SET
  display_name = COALESCE(display_name, 'SnapOrder Platform'),
  short_name = COALESCE(short_name, 'SnapOrder'),
  meta_description = COALESCE(meta_description, 'Gestão white-label de restaurantes'),
  platform_name = COALESCE(NULLIF(platform_name, ''), 'SnapOrder')
WHERE display_name IS NULL OR short_name IS NULL OR meta_description IS NULL;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS icon_192_url text,
  ADD COLUMN IF NOT EXISTS icon_512_url text,
  ADD COLUMN IF NOT EXISTS apple_touch_icon_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text;

COMMENT ON COLUMN public.platform_settings.favicon_url IS 'Fase 2: servido dinamicamente por domínio via edge';
COMMENT ON COLUMN public.company_settings.favicon_url IS 'Ícone do separador; fallback logo_main_url';
