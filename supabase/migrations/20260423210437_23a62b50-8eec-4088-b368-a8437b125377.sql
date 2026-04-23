-- Tabela singleton de configurações globais da plataforma
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'Totem SaaS',
  support_email text NOT NULL DEFAULT 'suporte@exemplo.com',
  default_language text NOT NULL DEFAULT 'pt',
  default_currency text NOT NULL DEFAULT 'BRL',
  default_timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  allow_signup boolean NOT NULL DEFAULT false,
  default_plan text NOT NULL DEFAULT 'free',
  default_max_orders integer NOT NULL DEFAULT 500,
  trial_days integer NOT NULL DEFAULT 14,
  email_notifications boolean NOT NULL DEFAULT true,
  over_limit_alerts boolean NOT NULL DEFAULT true,
  daily_summary boolean NOT NULL DEFAULT false,
  require_2fa boolean NOT NULL DEFAULT false,
  password_min_length integer NOT NULL DEFAULT 8,
  session_hours integer NOT NULL DEFAULT 24,
  ai_auto_menu boolean NOT NULL DEFAULT true,
  ai_auto_images boolean NOT NULL DEFAULT true,
  ai_image_style text NOT NULL DEFAULT 'realistic',
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT 'Estamos em manutenção. Voltamos em breve.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read platform_settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin master manage platform_settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Garante uma linha singleton
INSERT INTO public.platform_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Domínio customizado por tenant
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;

-- Bucket público para imagens de produtos geradas por IA
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read products bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Authenticated upload products bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated update products bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products');

CREATE POLICY "Authenticated delete products bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');