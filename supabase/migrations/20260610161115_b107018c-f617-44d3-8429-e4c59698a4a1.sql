CREATE TABLE IF NOT EXISTS public.store_onboarding_links (
  token text PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'live',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  revoked boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_store_onboarding_links_store ON public.store_onboarding_links(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_onboarding_links TO authenticated;
GRANT ALL ON public.store_onboarding_links TO service_role;

ALTER TABLE public.store_onboarding_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage onboarding links" ON public.store_onboarding_links;
CREATE POLICY "admins manage onboarding links" ON public.store_onboarding_links
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));