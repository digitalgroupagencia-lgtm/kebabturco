
-- 1) Tabela company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT 'EL REY',
  logo_main_url text,
  logo_secondary_url text,
  banner_home_url text,
  icon_dine_in_url text,
  icon_takeaway_url text,
  primary_color text NOT NULL DEFAULT '#D62300',
  secondary_color text NOT NULL DEFAULT '#FFC72C',
  background_color text NOT NULL DEFAULT '#FFFFFF',
  text_color text NOT NULL DEFAULT '#1A1A1A',
  accent_color text NOT NULL DEFAULT '#FFC72C',
  cta_color text NOT NULL DEFAULT '#28A745',
  button_style text NOT NULL DEFAULT 'rounded',
  font_family text DEFAULT 'Nunito',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read company_settings"
ON public.company_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Tenant members manage company_settings"
ON public.company_settings FOR ALL
TO authenticated
USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())))
WITH CHECK (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Admin master manage company_settings"
ON public.company_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Bucket público para branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Branding files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Authenticated can upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Authenticated can update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Authenticated can delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');

-- 3) Seed para a loja default
INSERT INTO public.company_settings (store_id, company_name)
VALUES ('b0000000-0000-0000-0000-000000000001', 'EL REY')
ON CONFLICT (store_id) DO NOTHING;
