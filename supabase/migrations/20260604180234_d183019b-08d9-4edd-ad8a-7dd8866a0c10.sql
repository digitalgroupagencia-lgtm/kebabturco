CREATE TABLE IF NOT EXISTS public._template_version (
  id boolean PRIMARY KEY DEFAULT true,
  version text NOT NULL,
  codename text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT _template_version_singleton CHECK (id = true)
);

GRANT SELECT ON public._template_version TO anon, authenticated;
GRANT ALL ON public._template_version TO service_role;

ALTER TABLE public._template_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read template version" ON public._template_version;
CREATE POLICY "Anyone can read template version"
  ON public._template_version FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admin master can change template version" ON public._template_version;
CREATE POLICY "Only admin master can change template version"
  ON public._template_version FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

INSERT INTO public._template_version (id, version, codename, notes)
VALUES (true, '1.0.0', 'Kebab Master', 'Bootstrap inicial do Master Template')
ON CONFLICT (id) DO UPDATE
  SET version = EXCLUDED.version,
      codename = EXCLUDED.codename,
      applied_at = now(),
      notes = EXCLUDED.notes;