-- ============ 1. Novos campos em tenants para domínio/path ============
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS path_slug text,
  ADD COLUMN IF NOT EXISTS use_master_domain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS master_domain text;

-- path_slug deve ser único quando preenchido
CREATE UNIQUE INDEX IF NOT EXISTS tenants_path_slug_unique
  ON public.tenants(path_slug)
  WHERE path_slug IS NOT NULL;

-- ============ 2. Novos campos em totem_config para splash ============
ALTER TABLE public.totem_config
  ADD COLUMN IF NOT EXISTS splash_logo_url text,
  ADD COLUMN IF NOT EXISTS splash_logo_dark_url text,
  ADD COLUMN IF NOT EXISTS splash_title jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS splash_subtitle jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS splash_image_duration_ms integer NOT NULL DEFAULT 4000,
  ADD COLUMN IF NOT EXISTS splash_show_text boolean NOT NULL DEFAULT true;

-- ============ 3. Nova tabela splash_media (playlist) ============
CREATE TABLE IF NOT EXISTS public.splash_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  url text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 4000,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS splash_media_store_idx ON public.splash_media(store_id, sort_order);

ALTER TABLE public.splash_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active splash_media" ON public.splash_media;
CREATE POLICY "Public can read active splash_media"
  ON public.splash_media FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant members manage splash_media" ON public.splash_media;
CREATE POLICY "Tenant members manage splash_media"
  ON public.splash_media FOR ALL
  TO authenticated
  USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

DROP POLICY IF EXISTS "Admin master manage splash_media" ON public.splash_media;
CREATE POLICY "Admin master manage splash_media"
  ON public.splash_media FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP TRIGGER IF EXISTS update_splash_media_updated_at ON public.splash_media;
CREATE TRIGGER update_splash_media_updated_at
  BEFORE UPDATE ON public.splash_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. Garantir que cada tenant tem sua própria store ============
-- Cria store para Kebab Turco se não tiver
INSERT INTO public.stores (id, tenant_id, name, is_active)
SELECT gen_random_uuid(), t.id, t.name, true
FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.tenant_id = t.id);

-- ============ 5. Cria configs default para qualquer store sem configs ============
INSERT INTO public.company_settings (store_id, company_name)
SELECT s.id, t.name
FROM public.stores s
JOIN public.tenants t ON t.id = s.tenant_id
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings cs WHERE cs.store_id = s.id);

INSERT INTO public.totem_config (store_id, primary_language, active_languages)
SELECT s.id, 'es', ARRAY['es']
FROM public.stores s
WHERE NOT EXISTS (SELECT 1 FROM public.totem_config tc WHERE tc.store_id = s.id);

INSERT INTO public.operations_settings (store_id)
SELECT s.id
FROM public.stores s
WHERE NOT EXISTS (SELECT 1 FROM public.operations_settings os WHERE os.store_id = s.id);

-- ============ 6. Restaurar identidade do El Rey ============
-- O company_settings da única store antiga estava com KEBAB TURCO; é a store do El Rey
UPDATE public.company_settings
SET company_name = 'EL REY',
    logo_main_url = NULL,
    logo_main_dark_url = NULL,
    logo_secondary_url = NULL,
    logo_secondary_dark_url = NULL,
    logo_language_url = NULL,
    logo_language_dark_url = NULL,
    logo_order_type_url = NULL,
    logo_order_type_dark_url = NULL,
    icon_dine_in_url = NULL,
    icon_takeaway_url = NULL,
    banner_home_url = NULL
WHERE store_id = 'b0000000-0000-0000-0000-000000000001';

-- ============ 7. Configurar dominios padrão dos tenants existentes ============
-- El Rey: domínio próprio sem path
UPDATE public.tenants
SET custom_domain = 'elreypizzeria.digitalgroupsti.com',
    use_master_domain = false,
    path_slug = NULL,
    master_domain = NULL
WHERE slug = 'burger-demo';

-- Kebab Turco: usa o domínio mestre do El Rey + path /kebabturco
UPDATE public.tenants
SET custom_domain = NULL,
    use_master_domain = true,
    master_domain = 'elreypizzeria.digitalgroupsti.com',
    path_slug = 'kebabturco'
WHERE slug = 'kebab-turco';