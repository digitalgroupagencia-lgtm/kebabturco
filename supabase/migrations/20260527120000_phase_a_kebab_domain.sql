-- Fase A white-label: Kebab Turco como tenant #1 + domínio próprio kebabturco.net
-- Mantém path legado /kebabturco no domínio mestre antigo (sem quebrar URLs antigas).

UPDATE public.tenants
SET
  custom_domain = 'kebabturco.net',
  use_master_domain = true,
  master_domain = 'elreypizzeria.digitalgroupsti.com',
  path_slug = 'kebabturco',
  is_active = true
WHERE slug = 'kebab-turco';

-- Marca visual da plataforma (singleton)
UPDATE public.platform_settings
SET platform_name = COALESCE(NULLIF(platform_name, ''), 'SnapOrder')
WHERE platform_name IN ('Totem SaaS', '', 'Kebab Turco');
