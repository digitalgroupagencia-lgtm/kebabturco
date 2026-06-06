
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  country text NOT NULL DEFAULT 'ES',
  supports_refund boolean NOT NULL DEFAULT false,
  supports_webhook boolean NOT NULL DEFAULT true,
  is_globally_enabled boolean NOT NULL DEFAULT true,
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_gateways TO anon, authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_gateways_read_all" ON public.payment_gateways FOR SELECT USING (true);
CREATE POLICY "payment_gateways_admin_master_write" ON public.payment_gateways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

INSERT INTO public.payment_gateways (code, name, description, supports_refund, supports_webhook, config_schema) VALUES
  ('stripe', 'Stripe', 'Pagamentos com cartão internacional', true, true,
    '{"fields":["publishable_key","secret_key","webhook_secret","connect_account_id"]}'::jsonb),
  ('redsys', 'Redsys (TPV Virtual)', 'Pagamentos com cartão via Redsys — Espanha', true, true,
    '{"fields":["merchant_code","terminal","secret_key","currency","transaction_type","merchant_name","success_url","failure_url","notification_url"]}'::jsonb),
  ('bizum', 'Bizum', 'Pagamento móvel Bizum (sobre Redsys)', false, true,
    '{"fields":["merchant_code","terminal","secret_key","success_url","failure_url","callback_url"]}'::jsonb)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.store_payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  gateway_code text NOT NULL REFERENCES public.payment_gateways(code) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('disabled','sandbox','production')),
  merchant_code text,
  terminal text,
  secret_key text,
  currency text DEFAULT '978',
  transaction_type text DEFAULT '0',
  merchant_name text,
  success_url text,
  failure_url text,
  notification_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_test_at timestamptz,
  last_test_success boolean,
  last_test_message text,
  enabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, gateway_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_payment_gateways TO authenticated;
GRANT ALL ON public.store_payment_gateways TO service_role;
ALTER TABLE public.store_payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spg_admin_master_all" ON public.store_payment_gateways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "spg_tenant_members_all" ON public.store_payment_gateways FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE tenant_id = public.get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE tenant_id = public.get_user_tenant_id(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_spg_store ON public.store_payment_gateways(store_id);

CREATE TABLE IF NOT EXISTS public.payment_gateway_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  gateway_code text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('request','response','webhook','error')),
  endpoint text,
  http_status integer,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_gateway_logs TO authenticated;
GRANT ALL ON public.payment_gateway_logs TO service_role;
ALTER TABLE public.payment_gateway_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgl_admin_master_read" ON public.payment_gateway_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "pgl_tenant_read" ON public.payment_gateway_logs FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE INDEX IF NOT EXISTS idx_pgl_store ON public.payment_gateway_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pgl_gateway ON public.payment_gateway_logs(gateway_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pgl_order ON public.payment_gateway_logs(order_id);

CREATE TABLE IF NOT EXISTS public.payment_gateway_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  gateway_code text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  external_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','captured','succeeded','failed','cancelled','refunded')),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  authorization_code text,
  response_code text,
  signature_valid boolean,
  raw_request jsonb,
  raw_response jsonb,
  raw_notification jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_gateway_transactions TO authenticated;
GRANT ALL ON public.payment_gateway_transactions TO service_role;
ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgt_admin_master_all" ON public.payment_gateway_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "pgt_tenant_read" ON public.payment_gateway_transactions FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE tenant_id = public.get_user_tenant_id(auth.uid())));
CREATE INDEX IF NOT EXISTS idx_pgt_store ON public.payment_gateway_transactions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pgt_order ON public.payment_gateway_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pgt_ext ON public.payment_gateway_transactions(external_reference);

CREATE TABLE IF NOT EXISTS public.payment_gateway_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_code text NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  external_reference text,
  raw_headers jsonb,
  raw_body text,
  signature text,
  signature_valid boolean,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_gateway_webhooks TO authenticated;
GRANT ALL ON public.payment_gateway_webhooks TO service_role;
ALTER TABLE public.payment_gateway_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pgw_admin_master_read" ON public.payment_gateway_webhooks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'));
CREATE INDEX IF NOT EXISTS idx_pgw_gateway ON public.payment_gateway_webhooks(gateway_code, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_pgw_ext ON public.payment_gateway_webhooks(external_reference);

CREATE TRIGGER trg_payment_gateways_updated BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spg_updated BEFORE UPDATE ON public.store_payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pgt_updated BEFORE UPDATE ON public.payment_gateway_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
