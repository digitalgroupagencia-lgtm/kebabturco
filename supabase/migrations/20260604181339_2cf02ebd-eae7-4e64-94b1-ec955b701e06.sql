
CREATE TABLE IF NOT EXISTS public.template_update_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_name text,
  update_type text NOT NULL DEFAULT 'mixed',
  migration_names text[] NOT NULL DEFAULT '{}',
  notes text,
  requires_apk_rebuild boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.template_update_history TO authenticated;
GRANT ALL ON public.template_update_history TO service_role;

ALTER TABLE public.template_update_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_master read history" ON public.template_update_history;
CREATE POLICY "admin_master read history"
  ON public.template_update_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));

DROP POLICY IF EXISTS "admin_master write history" ON public.template_update_history;
CREATE POLICY "admin_master write history"
  ON public.template_update_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

DROP POLICY IF EXISTS "admin_master update history" ON public.template_update_history;
CREATE POLICY "admin_master update history"
  ON public.template_update_history FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE INDEX IF NOT EXISTS idx_template_update_history_applied_at
  ON public.template_update_history(applied_at DESC);

CREATE OR REPLACE FUNCTION public.get_template_version_status()
RETURNS TABLE(version text, applied_at timestamptz, project_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT version, applied_at, NULL::text AS project_name
  FROM public._template_version
  ORDER BY applied_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_template_version_status() TO authenticated;

UPDATE public._template_version
   SET version = '1.1.0', applied_at = now()
 WHERE TRUE;

INSERT INTO public._template_version (version, applied_at)
SELECT '1.1.0', now()
WHERE NOT EXISTS (SELECT 1 FROM public._template_version);
