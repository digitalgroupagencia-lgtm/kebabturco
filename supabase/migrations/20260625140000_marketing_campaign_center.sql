-- Marketing Campaign Center: extended schema, tenant settings, scheduling queue

-- ========== 1. Extend marketing_campaigns ==========
ALTER TABLE public.marketing_campaigns
  DROP CONSTRAINT IF EXISTS marketing_campaigns_campaign_type_check;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS preset_key text,
  ADD COLUMN IF NOT EXISTS send_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'all_subscribers',
  ADD COLUMN IF NOT EXISTS audience_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule_time time,
  ADD COLUMN IF NOT EXISTS schedule_days integer[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language_mode text NOT NULL DEFAULT 'customer_last',
  ADD COLUMN IF NOT EXISTS linked_coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_frequency_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_destination_type text NOT NULL DEFAULT 'menu',
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS only_when_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_pt text,
  ADD COLUMN IF NOT EXISTS title_es text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS message_pt text,
  ADD COLUMN IF NOT EXISTS message_es text,
  ADD COLUMN IF NOT EXISTS message_en text;

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_campaign_type_check
    CHECK (campaign_type IN (
      'winback', 'abandoned_cart', 'loyalty_reward', 'promo',
      'welcome', 'operational', 'broadcast', 'loyalty', 'subscriber'
    ));

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_send_mode_check
    CHECK (send_mode IN ('auto', 'manual', 'scheduled'));

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_language_mode_check
    CHECK (language_mode IN ('customer_last', 'store_default', 'fixed_pt', 'fixed_es', 'fixed_en'));

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_origin_check
    CHECK (origin IN ('preset', 'custom'));

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_push_destination_check
    CHECK (push_destination_type IN ('menu', 'product', 'coupon', 'custom_url'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_campaigns_store_preset
  ON public.marketing_campaigns (store_id, preset_key)
  WHERE preset_key IS NOT NULL;

-- ========== 2. Order locale for customer_last language ==========
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_locale text;

CREATE INDEX IF NOT EXISTS idx_orders_store_phone_created
  ON public.orders (store_id, customer_phone, created_at DESC)
  WHERE customer_phone IS NOT NULL AND trim(customer_phone) <> '';

CREATE OR REPLACE VIEW public.customer_last_order_locale AS
SELECT DISTINCT ON (o.store_id, trim(o.customer_phone))
  o.store_id,
  trim(o.customer_phone) AS customer_phone,
  COALESCE(NULLIF(trim(o.order_locale), ''), 'es') AS order_locale,
  o.created_at AS last_order_at
FROM public.orders o
WHERE o.customer_phone IS NOT NULL
  AND trim(o.customer_phone) <> ''
  AND o.status <> 'cancelled'
ORDER BY o.store_id, trim(o.customer_phone), o.created_at DESC;

GRANT SELECT ON public.customer_last_order_locale TO authenticated;
GRANT SELECT ON public.customer_last_order_locale TO service_role;

-- ========== 3. Tenant marketing settings ==========
CREATE TABLE IF NOT EXISTS public.tenant_marketing_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  auto_campaigns_enabled boolean NOT NULL DEFAULT true,
  manual_broadcast_enabled boolean NOT NULL DEFAULT true,
  max_active_campaigns integer NOT NULL DEFAULT 10,
  max_sends_per_month integer NOT NULL DEFAULT 500,
  ai_suggestions_enabled boolean NOT NULL DEFAULT false,
  anti_spam_max_pushes integer NOT NULL DEFAULT 2,
  anti_spam_window_days integer NOT NULL DEFAULT 30,
  presets_installed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_marketing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master manage tenant_marketing_settings" ON public.tenant_marketing_settings;
CREATE POLICY "Admin master manage tenant_marketing_settings"
  ON public.tenant_marketing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Tenant read own marketing settings" ON public.tenant_marketing_settings;
CREATE POLICY "Tenant read own marketing settings"
  ON public.tenant_marketing_settings FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin_master'::app_role)
  );

DROP POLICY IF EXISTS "Tenant staff update own marketing settings" ON public.tenant_marketing_settings;
CREATE POLICY "Tenant staff update own marketing settings"
  ON public.tenant_marketing_settings FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Seed defaults for existing tenants
INSERT INTO public.tenant_marketing_settings (tenant_id)
SELECT t.id FROM public.tenants t
WHERE NOT t.is_template
ON CONFLICT (tenant_id) DO NOTHING;

-- ========== 4. Scheduled campaign runs queue ==========
CREATE TABLE IF NOT EXISTS public.scheduled_campaign_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled')),
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_campaign_runs_pending
  ON public.scheduled_campaign_runs (scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.scheduled_campaign_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant manage scheduled campaign runs" ON public.scheduled_campaign_runs;
CREATE POLICY "Tenant manage scheduled campaign runs"
  ON public.scheduled_campaign_runs FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

-- ========== 5. Products featured flag ==========
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS marketing_featured boolean NOT NULL DEFAULT false;

-- ========== 6. campaign_send_log anti-spam index ==========
ALTER TABLE public.campaign_send_log
  ADD COLUMN IF NOT EXISTS message_locale text,
  ADD COLUMN IF NOT EXISTS resolved_title text,
  ADD COLUMN IF NOT EXISTS resolved_body text;

CREATE INDEX IF NOT EXISTS idx_campaign_send_log_antispam
  ON public.campaign_send_log (store_id, customer_phone, sent_at DESC)
  WHERE status = 'sent';

-- ========== 7. Customer inactive view (winback) ==========
CREATE OR REPLACE VIEW public.customer_last_orders AS
SELECT
  o.store_id,
  trim(o.customer_phone) AS customer_phone,
  max(o.created_at) AS last_order_at,
  count(*)::integer AS total_orders
FROM public.orders o
WHERE o.customer_phone IS NOT NULL
  AND trim(o.customer_phone) <> ''
  AND o.status <> 'cancelled'
GROUP BY o.store_id, trim(o.customer_phone);

GRANT SELECT ON public.customer_last_orders TO authenticated;
GRANT SELECT ON public.customer_last_orders TO service_role;

-- ========== 8. Install presets RPC ==========
CREATE OR REPLACE FUNCTION public.install_marketing_presets(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_count integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = _store_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  INSERT INTO public.tenant_marketing_settings (tenant_id) VALUES (v_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO public.marketing_campaigns (
    store_id, name, campaign_type, message_template, trigger_days, trigger_event,
    title, push_url, is_active, preset_key, send_mode, audience_type, origin,
    title_pt, title_es, title_en, message_pt, message_es, message_en, language_mode, audience_config, only_when_open, schedule_time, schedule_days
  )
  SELECT * FROM (VALUES
    (_store_id, 'Boas-vindas +2 dias', 'welcome', 'Volte em breve — temos novidades na carta.', 2, 'first_order', 'Obrigado pela primeira encomenda!', '/', false, 'welcome_2d', 'auto', 'first_order_recent', 'preset', 'Obrigado pela primeira encomenda!', '¡Gracias por tu primer pedido!', 'Thanks for your first order!', 'Volte em breve — temos novidades na carta.', 'Vuelve pronto — tenemos novedades en la carta.', 'Come back soon — we have menu news.', 'customer_last', '{}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Reforço +5 dias', 'welcome', 'Peça de novo hoje com entrega rápida.', 5, 'first_order', 'Como foi a experiência?', '/', false, 'welcome_5d', 'auto', 'first_order_recent', 'preset', 'Como foi a experiência?', '¿Cómo fue la experiencia?', 'How was your experience?', 'Peça de novo hoje com entrega rápida.', 'Pide de nuevo hoy con entrega rápida.', 'Order again today with fast delivery.', 'customer_last', '{}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Novo subscritor push', 'subscriber', 'Active as notificações e receba ofertas exclusivas.', NULL, 'new_subscriber', 'Bem-vindo às nossas notificações!', '/', false, 'new_subscriber', 'auto', 'marketing_subscribers', 'preset', 'Bem-vindo às nossas notificações!', '¡Bienvenido a nuestras notificaciones!', 'Welcome to our notifications!', 'Active as notificações e receba ofertas exclusivas.', 'Activa las notificaciones y recibe ofertas exclusivas.', 'Enable notifications and get exclusive offers.', 'customer_last', '{}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Winback 30 dias', 'winback', 'Há tempo que não pede — volte hoje!', 30, 'inactive', 'Sentimos a sua falta', '/', false, 'winback_30d', 'auto', 'inactive_customers', 'preset', 'Sentimos a sua falta', 'Te echamos de menos', 'We miss you', 'Há tempo que não pede — volte hoje!', '¡Hace tiempo que no pides — vuelve hoy!', 'It''s been a while — come back today!', 'customer_last', '{"suggest_coupon":"VOLTA10"}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Winback 60 dias', 'winback', 'Fazemos falta? Volte connosco!', 60, 'inactive', 'Oferta especial para si', '/', false, 'winback_60d', 'auto', 'inactive_customers', 'preset', 'Oferta especial para si', 'Oferta especial para ti', 'Special offer for you', 'Fazemos falta? Volte connosco!', '¿Nos echas de menos? ¡Vuelve con nosotros!', 'Miss us? Come back!', 'customer_last', '{"suggest_coupon":"VOLTA10"}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Quase recompensa', 'loyalty', 'Faltam só {carimbos_faltam} carimbos!', NULL, 'loyalty_threshold', 'Quase lá!', '/', false, 'loyalty_almost', 'auto', 'loyalty_near_reward', 'preset', 'Quase lá!', '¡Casi lo tienes!', 'Almost there!', 'Faltam só {carimbos_faltam} carimbos!', '¡Solo faltan {carimbos_faltam} sellos!', 'Only {carimbos_faltam} stamps left!', 'customer_last', '{"stamps_threshold":8}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Promo fim-de-semana', 'promo', 'Este fim-de-semana: {produto_destaque} por {preco_destaque}!', NULL, 'schedule_cron', 'Promoção de fim-de-semana', '/', false, 'promo_weekend', 'scheduled', 'all_subscribers', 'preset', 'Promoção de fim-de-semana', 'Promoción de fin de semana', 'Weekend promo', 'Este fim-de-semana: {produto_destaque} por {preco_destaque}!', '¡Este fin de semana: {produto_destaque} por {preco_destaque}!', 'This weekend: {produto_destaque} for {preco_destaque}!', 'customer_last', '{}'::jsonb, false, NULL::time, ARRAY[6,0]),
    (_store_id, 'Promo almoço', 'promo', 'Hoje ao almoço: {produto_destaque}!', NULL, 'schedule_cron', 'Oferta de almoço', '/', false, 'promo_lunch', 'scheduled', 'all_subscribers', 'preset', 'Oferta de almoço', 'Oferta de almuerzo', 'Lunch offer', 'Hoje ao almoço: {produto_destaque}!', 'Hoy al mediodía: {produto_destaque}!', 'Lunch today: {produto_destaque}!', 'customer_last', '{}'::jsonb, true, '12:30'::time, ARRAY[1,2,3,4,5]),
    (_store_id, 'Estamos abertos', 'operational', '{nome_restaurante} está aberto!', NULL, 'store_open', 'Estamos abertos!', '/', false, 'open_now', 'auto', 'all_subscribers', 'preset', 'Estamos abertos!', '¡Estamos abiertos!', 'We''re open!', '{nome_restaurante} está aberto!', '¡{nome_restaurante} está abierto!', '{nome_restaurante} is open!', 'customer_last', '{}'::jsonb, true, NULL::time, NULL::integer[]),
    (_store_id, 'Fecha em breve', 'operational', 'Fechamos em breve!', NULL, 'store_open', 'Última chamada', '/', false, 'closed_soon', 'auto', 'all_subscribers', 'preset', 'Última chamada', 'Última llamada', 'Last call', 'Fechamos em breve!', 'Cerramos pronto!', 'Closing soon!', 'customer_last', '{"closing_soon_minutes":30}'::jsonb, false, NULL::time, NULL::integer[])
  ) AS v(store_id, name, campaign_type, message_template, trigger_days, trigger_event, title, push_url, is_active, preset_key, send_mode, audience_type, origin, title_pt, title_es, title_en, message_pt, message_es, message_en, language_mode, audience_config, only_when_open, schedule_time, schedule_days)
  ON CONFLICT (store_id, preset_key) WHERE preset_key IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.tenant_marketing_settings
  SET presets_installed = true, updated_at = now()
  WHERE tenant_id = v_tenant_id;

  RETURN jsonb_build_object('ok', true, 'inserted', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.install_marketing_presets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.install_marketing_presets(uuid) TO service_role;

-- Anti-spam check helper
CREATE OR REPLACE FUNCTION public.marketing_push_count_recent(
  _store_id uuid,
  _customer_phone text,
  _window_days integer DEFAULT 30
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.campaign_send_log
  WHERE store_id = _store_id
    AND customer_phone = trim(_customer_phone)
    AND status = 'sent'
    AND sent_at >= now() - make_interval(days => _window_days);
$$;

GRANT EXECUTE ON FUNCTION public.marketing_push_count_recent(uuid, text, integer) TO service_role;
