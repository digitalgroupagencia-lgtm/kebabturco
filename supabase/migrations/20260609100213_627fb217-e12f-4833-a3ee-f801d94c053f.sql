
-- Phase D: Build Center — registro histórico de builds Android/iOS (sem execução real)
CREATE TYPE public.app_build_platform AS ENUM ('android', 'ios');
CREATE TYPE public.app_build_status AS ENUM ('planned', 'in_progress', 'success', 'failed', 'cancelled');

CREATE TABLE public.tenant_app_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform public.app_build_platform NOT NULL,
  version text,
  build_number text,
  status public.app_build_status NOT NULL DEFAULT 'planned',
  artifact_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_app_builds TO authenticated;
GRANT ALL ON public.tenant_app_builds TO service_role;

ALTER TABLE public.tenant_app_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master full access tenant_app_builds"
  ON public.tenant_app_builds
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

CREATE POLICY "restaurant_admin reads own tenant builds"
  ON public.tenant_app_builds
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'restaurant_admin'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = tenant_app_builds.tenant_id
    )
  );

CREATE TRIGGER trg_tenant_app_builds_updated_at
  BEFORE UPDATE ON public.tenant_app_builds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tenant_app_builds_tenant ON public.tenant_app_builds(tenant_id, created_at DESC);
