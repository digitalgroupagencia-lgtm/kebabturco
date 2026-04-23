-- ============ PROMO BANNERS (carrossel do totem) ============
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_banners_store ON public.promo_banners(store_id, sort_order);

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promo banners"
  ON public.promo_banners FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admin master manage promo_banners"
  ON public.promo_banners FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Tenant members manage promo_banners"
  ON public.promo_banners FOR ALL TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

CREATE TRIGGER update_promo_banners_updated_at
  BEFORE UPDATE ON public.promo_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ OPERATIONS SETTINGS (pagamento + banner) ============
CREATE TABLE public.operations_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,

  -- banner
  banner_enabled boolean NOT NULL DEFAULT false,
  banner_interval_ms integer NOT NULL DEFAULT 5000,

  -- pagamento (modo + métodos)
  payment_mode text NOT NULL DEFAULT 'online', -- 'online' | 'counter' | 'mixed'
  pay_card_enabled boolean NOT NULL DEFAULT true,
  pay_cash_enabled boolean NOT NULL DEFAULT false,
  pay_pix_enabled boolean NOT NULL DEFAULT false,
  pay_apple_enabled boolean NOT NULL DEFAULT false,
  pay_google_enabled boolean NOT NULL DEFAULT false,
  pay_counter_enabled boolean NOT NULL DEFAULT false,
  pay_link_enabled boolean NOT NULL DEFAULT false,

  -- mensagens da confirmação
  msg_paid text NOT NULL DEFAULT 'Pago confirmado',
  msg_counter text NOT NULL DEFAULT 'Pago pendiente en mostrador',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operations_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read operations_settings"
  ON public.operations_settings FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin master manage operations_settings"
  ON public.operations_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Tenant members manage operations_settings"
  ON public.operations_settings FOR ALL TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

CREATE TRIGGER update_operations_settings_updated_at
  BEFORE UPDATE ON public.operations_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRINTER SETTINGS (ESC/POS via IP) ============
CREATE TABLE public.printer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  printer_name text NOT NULL DEFAULT 'Cocina',
  ip_address text,
  port integer NOT NULL DEFAULT 9100,
  -- agente local (bridge) que recebe os pedidos via HTTPS e imprime no IP local
  agent_endpoint text,
  last_test_at timestamptz,
  last_test_ok boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manage printer_settings"
  ON public.printer_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Tenant members manage printer_settings"
  ON public.printer_settings FOR ALL TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

CREATE TRIGGER update_printer_settings_updated_at
  BEFORE UPDATE ON public.printer_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para refletir mudanças no totem instantaneamente
ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_banners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operations_settings;

-- Seed default operations_settings para a loja existente
INSERT INTO public.operations_settings (store_id, payment_mode, pay_counter_enabled, pay_card_enabled)
SELECT id, 'online', true, true FROM public.stores
ON CONFLICT (store_id) DO NOTHING;