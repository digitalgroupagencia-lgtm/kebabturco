
-- ============================================================
-- Fase A: Distribuição comercial por tenant (PWA / Android / iOS)
-- ============================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.app_distribution_type AS ENUM ('pwa', 'native_app');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pwa_status AS ENUM ('draft', 'active', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_store_status AS ENUM (
    'not_started', 'draft', 'in_review', 'published', 'rejected', 'disabled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela 1:1 com tenants
CREATE TABLE IF NOT EXISTS public.tenant_app_distribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

  distribution_type public.app_distribution_type NOT NULL DEFAULT 'pwa',

  -- PWA
  pwa_status public.pwa_status NOT NULL DEFAULT 'active',

  -- Android
  android_app_status public.app_store_status NOT NULL DEFAULT 'not_started',
  android_package_id text,
  android_version text,
  android_published_at timestamptz,
  android_play_console_url text,

  -- iOS
  ios_app_status public.app_store_status NOT NULL DEFAULT 'not_started',
  ios_bundle_id text,
  ios_version text,
  ios_published_at timestamptz,
  ios_appstore_connect_url text,

  -- Assets do app nativo
  native_app_start_url text,
  native_app_icon_url text,
  native_app_splash_url text,
  native_app_screenshots jsonb NOT NULL DEFAULT '[]'::jsonb,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_app_distribution TO authenticated;
GRANT ALL ON public.tenant_app_distribution TO service_role;

-- 4. RLS
ALTER TABLE public.tenant_app_distribution ENABLE ROW LEVEL SECURITY;

-- admin_master: total
CREATE POLICY "admin_master full access on tenant_app_distribution"
  ON public.tenant_app_distribution
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- restaurant_admin: leitura do próprio tenant
CREATE POLICY "tenant admin reads own distribution"
  ON public.tenant_app_distribution
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'restaurant_admin'
        AND ur.tenant_id = tenant_app_distribution.tenant_id
    )
  );

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.tenant_app_distribution_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_app_distribution_updated_at ON public.tenant_app_distribution;
CREATE TRIGGER trg_tenant_app_distribution_updated_at
  BEFORE UPDATE ON public.tenant_app_distribution
  FOR EACH ROW EXECUTE FUNCTION public.tenant_app_distribution_set_updated_at();

-- 6. Trigger: todo novo tenant nasce com distribuição PWA padrão
CREATE OR REPLACE FUNCTION public.seed_tenant_app_distribution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.tenant_app_distribution (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_app_distribution ON public.tenants;
CREATE TRIGGER trg_seed_tenant_app_distribution
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_tenant_app_distribution();

-- 7. Backfill para tenants existentes
INSERT INTO public.tenant_app_distribution (tenant_id)
SELECT t.id FROM public.tenants t
LEFT JOIN public.tenant_app_distribution d ON d.tenant_id = t.id
WHERE d.id IS NULL;
