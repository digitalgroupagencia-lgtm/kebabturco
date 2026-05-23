-- Fases 1–3: planos por funcionalidades, centrais operacionais, Kebab PREMIUM beta

-- ========== 1. Catálogo de planos ==========
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  central_group text NOT NULL DEFAULT 'core',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id uuid NOT NULL REFERENCES public.platform_plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.platform_features(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_plan_assignments (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.platform_plans(id),
  is_beta boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, feature_key)
);

-- ========== 2. Scaffold centrais (sem motores automáticos) ==========
CREATE TABLE IF NOT EXISTS public.tenant_ai_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_key text NOT NULL CHECK (module_key IN ('support', 'seller', 'recovery', 'marketing')),
  is_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'active', 'disabled')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.tenant_loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  model_type text NOT NULL DEFAULT 'stamps' CHECK (model_type IN ('stamps', 'points', 'cashback', 'vip')),
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_loyalty_one_active
  ON public.tenant_loyalty_programs (tenant_id)
  WHERE is_active = true;

-- ========== 3. RLS ==========
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_ai_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_loyalty_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read platform_plans" ON public.platform_plans;
CREATE POLICY "Authenticated read platform_plans"
  ON public.platform_plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin master manage platform_plans" ON public.platform_plans;
CREATE POLICY "Admin master manage platform_plans"
  ON public.platform_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Authenticated read platform_features" ON public.platform_features;
CREATE POLICY "Authenticated read platform_features"
  ON public.platform_features FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin master manage platform_features" ON public.platform_features;
CREATE POLICY "Admin master manage platform_features"
  ON public.platform_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Authenticated read plan_features" ON public.plan_features;
CREATE POLICY "Authenticated read plan_features"
  ON public.plan_features FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin master manage plan_features" ON public.plan_features;
CREATE POLICY "Admin master manage plan_features"
  ON public.plan_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Tenant read own plan assignment" ON public.tenant_plan_assignments;
CREATE POLICY "Tenant read own plan assignment"
  ON public.tenant_plan_assignments FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin_master'::app_role)
  );

DROP POLICY IF EXISTS "Admin master manage tenant_plan_assignments" ON public.tenant_plan_assignments;
CREATE POLICY "Admin master manage tenant_plan_assignments"
  ON public.tenant_plan_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Admin master manage tenant_feature_overrides" ON public.tenant_feature_overrides;
CREATE POLICY "Admin master manage tenant_feature_overrides"
  ON public.tenant_feature_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Tenant read own feature overrides" ON public.tenant_feature_overrides;
CREATE POLICY "Tenant read own feature overrides"
  ON public.tenant_feature_overrides FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Admin master manage tenant_ai_modules" ON public.tenant_ai_modules;
CREATE POLICY "Admin master manage tenant_ai_modules"
  ON public.tenant_ai_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Admin master manage tenant_loyalty_programs" ON public.tenant_loyalty_programs;
CREATE POLICY "Admin master manage tenant_loyalty_programs"
  ON public.tenant_loyalty_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

-- ========== 4. Seed planos ==========
INSERT INTO public.platform_plans (plan_key, name, description, sort_order) VALUES
  ('start', 'START', 'Essencial para começar online', 1),
  ('pro', 'PRO', 'Crescimento com fidelidade, campanhas e push', 2),
  ('premium', 'PREMIUM', 'Ecossistema completo com IA e multi-unidade', 3)
ON CONFLICT (plan_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ========== 5. Seed features ==========
INSERT INTO public.platform_features (feature_key, name, description, central_group, sort_order) VALUES
  ('menu', 'Cardápio', 'Gestão de produtos e categorias', 'core', 10),
  ('online_orders', 'Pedidos online', 'Checkout e pagamentos online', 'core', 20),
  ('qr_tables', 'QR / Mesas', 'Pedidos por mesa via QR', 'core', 30),
  ('delivery_basic', 'Delivery básico', 'Zonas e taxas de entrega', 'core', 40),
  ('custom_domain', 'Domínio próprio', 'Domínio ou subcaminho dedicado', 'core', 50),
  ('mobile_experience', 'Experiência mobile', 'Interface app-like no telemóvel', 'core', 60),
  ('pwa_install', 'App instalável', 'PWA instalável no telemóvel', 'growth', 70),
  ('push_notifications', 'Push notifications', 'Notificações push segmentadas', 'push', 80),
  ('loyalty', 'Fidelidade', 'Programa de fidelização', 'loyalty', 90),
  ('campaigns', 'Campanhas', 'Campanhas automáticas e promos', 'campaigns', 100),
  ('seller_app', 'App vendedor', 'Garçom / vendedor mobile', 'growth', 110),
  ('delivery_advanced', 'Delivery avançado', 'Regras avançadas de entrega', 'growth', 120),
  ('analytics', 'Analytics', 'Relatórios e métricas', 'growth', 130),
  ('customer_recovery', 'Recuperação clientes', 'Winback e reactivação', 'campaigns', 140),
  ('google_play', 'Google Play', 'Publicação Android', 'premium', 150),
  ('app_store', 'App Store', 'Publicação iOS', 'premium', 160),
  ('ai_support', 'IA atendimento', 'Assistente para clientes', 'ai', 170),
  ('ai_seller', 'IA vendedor', 'IA para equipa de sala', 'ai', 180),
  ('ai_automations', 'Automações IA', 'Fluxos automáticos inteligentes', 'ai', 190),
  ('multi_store', 'Multi-unidade', 'Várias lojas por cliente', 'premium', 200),
  ('advanced_dashboards', 'Dashboards avançados', 'Painéis analíticos premium', 'premium', 210),
  ('conversational_ordering', 'Conversar para pedir', 'Pedido por conversa com IA', 'ai', 220)
ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  central_group = EXCLUDED.central_group,
  sort_order = EXCLUDED.sort_order;

-- ========== 6. Plan ↔ features ==========
INSERT INTO public.plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM public.platform_plans p
CROSS JOIN public.platform_features f
WHERE p.plan_key = 'start'
  AND f.feature_key IN ('menu', 'online_orders', 'qr_tables', 'delivery_basic', 'custom_domain', 'mobile_experience')
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM public.platform_plans p
CROSS JOIN public.platform_features f
WHERE p.plan_key = 'pro'
  AND f.feature_key IN (
    'menu', 'online_orders', 'qr_tables', 'delivery_basic', 'custom_domain', 'mobile_experience',
    'pwa_install', 'push_notifications', 'loyalty', 'campaigns', 'seller_app',
    'delivery_advanced', 'analytics', 'customer_recovery'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM public.platform_plans p
CROSS JOIN public.platform_features f
WHERE p.plan_key = 'premium'
ON CONFLICT DO NOTHING;

-- ========== 7. Migrar tenants.plan + assignments ==========
UPDATE public.tenants SET plan = 'start' WHERE plan IN ('free', 'starter', '') OR plan IS NULL;
UPDATE public.tenants SET plan = 'pro' WHERE plan = 'pro';
UPDATE public.tenants SET plan = 'premium' WHERE plan IN ('enterprise', 'premium');
UPDATE public.tenants SET plan = 'premium' WHERE slug = 'kebab-turco';

INSERT INTO public.tenant_plan_assignments (tenant_id, plan_id, is_beta)
SELECT t.id, p.id, (t.slug = 'kebab-turco')
FROM public.tenants t
JOIN public.platform_plans p ON p.plan_key = t.plan
WHERE t.is_template = false
ON CONFLICT (tenant_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  is_beta = EXCLUDED.is_beta,
  updated_at = now();

-- Kebab: módulos IA scaffold + fidelidade carimbos
INSERT INTO public.tenant_ai_modules (tenant_id, module_key, is_enabled, status)
SELECT t.id, m.key, false, 'prepared'
FROM public.tenants t
CROSS JOIN (VALUES ('support'), ('seller'), ('recovery'), ('marketing')) AS m(key)
WHERE t.slug = 'kebab-turco'
ON CONFLICT (tenant_id, module_key) DO NOTHING;

INSERT INTO public.tenant_loyalty_programs (tenant_id, model_type, is_active, config)
SELECT t.id, 'stamps', true, '{"stamps_needed": 10}'::jsonb
FROM public.tenants t
WHERE t.slug = 'kebab-turco'
ON CONFLICT DO NOTHING;

-- ========== 8. RPCs ==========
CREATE OR REPLACE FUNCTION public.get_tenant_feature_flags(_tenant_id uuid)
RETURNS TABLE(
  feature_key text,
  name text,
  central_group text,
  enabled boolean,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH plan_feats AS (
    SELECT pf.feature_key, pf.name, pf.central_group, true AS from_plan
    FROM public.tenant_plan_assignments tpa
    JOIN public.plan_features plf ON plf.plan_id = tpa.plan_id
    JOIN public.platform_features pf ON pf.id = plf.feature_id
    WHERE tpa.tenant_id = _tenant_id AND pf.is_active = true
  ),
  overrides AS (
    SELECT feature_key, enabled FROM public.tenant_feature_overrides WHERE tenant_id = _tenant_id
  ),
  all_feats AS (
    SELECT pf.feature_key, pf.name, pf.central_group
    FROM public.platform_features pf
    WHERE pf.is_active = true
  )
  SELECT
    af.feature_key,
    af.name,
    af.central_group,
    COALESCE(o.enabled, EXISTS (SELECT 1 FROM plan_feats pf WHERE pf.feature_key = af.feature_key), false) AS enabled,
    CASE
      WHEN o.feature_key IS NOT NULL THEN 'override'
      WHEN EXISTS (SELECT 1 FROM plan_feats pf WHERE pf.feature_key = af.feature_key) THEN 'plan'
      ELSE 'none'
    END AS source
  FROM all_feats af
  LEFT JOIN overrides o ON o.feature_key = af.feature_key
  ORDER BY af.central_group, af.feature_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_feature_flags(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_has_feature(_tenant_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.tenant_feature_overrides WHERE tenant_id = _tenant_id AND feature_key = _feature_key),
    EXISTS (
      SELECT 1
      FROM public.tenant_plan_assignments tpa
      JOIN public.plan_features plf ON plf.plan_id = tpa.plan_id
      JOIN public.platform_features pf ON pf.id = plf.feature_id
      WHERE tpa.tenant_id = _tenant_id AND pf.feature_key = _feature_key
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.tenant_has_feature(uuid, text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.set_tenant_plan(_tenant_id uuid, _plan_key text, _is_beta boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO v_plan_id FROM public.platform_plans WHERE plan_key = _plan_key LIMIT 1;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Plano inválido'; END IF;

  UPDATE public.tenants SET plan = _plan_key, updated_at = now() WHERE id = _tenant_id;

  INSERT INTO public.tenant_plan_assignments (tenant_id, plan_id, is_beta)
  VALUES (_tenant_id, v_plan_id, _is_beta)
  ON CONFLICT (tenant_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    is_beta = EXCLUDED.is_beta,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_plan(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_tenant_feature_override(
  _tenant_id uuid,
  _feature_key text,
  _enabled boolean,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.tenant_feature_overrides (tenant_id, feature_key, enabled, notes)
  VALUES (_tenant_id, _feature_key, _enabled, _notes)
  ON CONFLICT (tenant_id, feature_key) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    notes = COALESCE(EXCLUDED.notes, tenant_feature_overrides.notes),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_tenant_feature_override(uuid, text, boolean, text) TO authenticated;

-- Uso mensal informativo (sem limite)
CREATE OR REPLACE FUNCTION public.get_tenant_monthly_usage(_tenant_id uuid)
RETURNS TABLE(used bigint, limit_max integer, pct numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE s.tenant_id = _tenant_id
        AND o.created_at >= date_trunc('month', now())
        AND o.status != 'cancelled'
    ), 0) AS used,
    0 AS limit_max,
    0::numeric AS pct;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_over_limit(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;

COMMENT ON COLUMN public.tenants.max_orders_month IS 'LEGACY — ignorado; planos usam funcionalidades (platform_plans)';
