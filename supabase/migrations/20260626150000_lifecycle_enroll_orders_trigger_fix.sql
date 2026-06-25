-- Corrige: customer_first_orders é uma VIEW — o trigger de lifecycle fica em public.orders.
-- Correr DEPOIS de 20260626140000 (mesmo que tenha falhado no trigger, as tabelas já existem).

CREATE OR REPLACE FUNCTION public.enroll_customer_marketing_lifecycle_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_phone IS NULL OR trim(NEW.customer_phone) = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'cancelled'::public.order_status THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.store_id = NEW.store_id
      AND trim(o.customer_phone) = trim(NEW.customer_phone)
      AND o.status <> 'cancelled'::public.order_status
      AND o.id <> NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_marketing_lifecycle (store_id, customer_phone, stage, started_at, welcome_ends_at, relation_ends_at)
  VALUES (
    NEW.store_id,
    trim(NEW.customer_phone),
    'welcome',
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now()) + interval '30 days',
    COALESCE(NEW.created_at, now()) + interval '90 days'
  )
  ON CONFLICT (store_id, customer_phone) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enroll_customer_lifecycle ON public.customer_first_orders;
DROP TRIGGER IF EXISTS trg_enroll_customer_lifecycle ON public.orders;
CREATE TRIGGER trg_enroll_customer_lifecycle
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enroll_customer_marketing_lifecycle_from_order();

-- Resto de 20260626140000 (não aplicado se o script parou no trigger da view)
CREATE OR REPLACE FUNCTION public.install_marketing_presets(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_count integer := 0;
  v_mandatory integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = _store_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  INSERT INTO public.tenant_marketing_settings (tenant_id, push_enabled, auto_campaigns_enabled)
  VALUES (v_tenant_id, true, true)
  ON CONFLICT (tenant_id) DO UPDATE SET
    auto_campaigns_enabled = COALESCE(public.tenant_marketing_settings.auto_campaigns_enabled, true),
    updated_at = now();

  INSERT INTO public.marketing_campaigns (
    store_id, name, campaign_type, message_template, trigger_days, trigger_event,
    title, push_url, is_active, preset_key, send_mode, audience_type, origin,
    title_pt, title_es, title_en, message_pt, message_es, message_en, language_mode, audience_config, only_when_open, schedule_time, schedule_days
  )
  SELECT * FROM (VALUES
    (_store_id, 'Boas-vindas +2 dias', 'welcome', 'Volte em breve — temos novidades na carta.', 2, 'first_order', 'Obrigado pela primeira encomenda!', '/', false, 'welcome_2d', 'auto', 'first_order_recent', 'preset', 'Obrigado pela primeira encomenda!', '¡Gracias por tu primer pedido!', 'Thanks for your first order!', 'Volte em breve — temos novidades na carta.', 'Vuelve pronto — tenemos novedades en la carta.', 'Come back soon — we have menu news.', 'customer_last', '{}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Reforço +5 dias', 'welcome', 'Peça de novo hoje com entrega rápida.', 5, 'first_order', 'Como foi a experiência?', '/', false, 'welcome_5d', 'auto', 'first_order_recent', 'preset', 'Como foi a experiência?', '¿Cómo fue la experiencia?', 'How was your experience?', 'Peça de novo hoje com entrega rápida.', 'Pide de nuevo hoy con entrega rápida.', 'Order again today with fast delivery.', 'customer_last', '{}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Novo subscritor push', 'subscriber', 'Active as notificações e receba ofertas exclusivas.', NULL, 'new_subscriber', 'Bem-vindo às nossas notificações!', '/', false, 'new_subscriber', 'auto', 'marketing_subscribers', 'preset', 'Bem-vindo às nossas notificações!', '¡Bienvenido a nuestras notificaciones!', 'Welcome to our notifications!', 'Active as notificações e receba ofertas exclusivas.', 'Activa las notificaciones y recibe ofertas exclusivas.', 'Enable notifications and get exclusive offers.', 'customer_last', '{}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Winback 30 dias', 'winback', 'Há tempo que não pede — volte hoje!', 30, 'inactive', 'Sentimos a sua falta', '/', true, 'winback_30d', 'auto', 'inactive_customers', 'preset', 'Sentimos a sua falta', 'Te echamos de menos', 'We miss you', 'Há tempo que não pede — volte hoje!', '¡Hace tiempo que no pides — vuelve hoy!', 'It''s been a while — come back today!', 'customer_last', '{"suggest_coupon":"VOLTA10","mandatory":true}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Winback 60 dias', 'winback', 'Fazemos falta? Volte connosco!', 60, 'inactive', 'Oferta especial para si', '/', true, 'winback_60d', 'auto', 'inactive_customers', 'preset', 'Oferta especial para si', 'Oferta especial para ti', 'Special offer for you', 'Fazemos falta? Volte connosco!', '¿Nos echas de menos? ¡Vuelve con nosotros!', 'Miss us? Come back!', 'customer_last', '{"suggest_coupon":"VOLTA10","mandatory":true}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Quase recompensa', 'loyalty', 'Faltam só {carimbos_faltam} carimbos!', NULL, 'loyalty_threshold', 'Quase lá!', '/', false, 'loyalty_almost', 'auto', 'loyalty_near_reward', 'preset', 'Quase lá!', '¡Casi lo tienes!', 'Almost there!', 'Faltam só {carimbos_faltam} carimbos!', '¡Solo faltan {carimbos_faltam} sellos!', 'Only {carimbos_faltam} stamps left!', 'customer_last', '{"stamps_threshold":8}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Promo fim-de-semana', 'promo', 'Este fim-de-semana: {produto_destaque} por {preco_destaque}!', NULL, 'schedule_cron', 'Promoção de fim-de-semana', '/', false, 'promo_weekend', 'scheduled', 'all_subscribers', 'preset', 'Promoção de fim-de-semana', 'Promoción de fin de semana', 'Weekend promo', 'Este fim-de-semana: {produto_destaque} por {preco_destaque}!', '¡Este fin de semana: {produto_destaque} por {preco_destaque}!', 'This weekend: {produto_destaque} for {preco_destaque}!', 'customer_last', '{}'::jsonb, false, NULL::time, ARRAY[6,0]),
    (_store_id, 'Promo almoço', 'promo', 'Hoje ao almoço: {produto_destaque}!', NULL, 'schedule_cron', 'Oferta de almoço', '/', false, 'promo_lunch', 'scheduled', 'all_subscribers', 'preset', 'Oferta de almoço', 'Oferta de almuerzo', 'Lunch offer', 'Hoje ao almoço: {produto_destaque}!', 'Hoy al mediodía: {produto_destaque}!', 'Lunch today: {produto_destaque}!', 'customer_last', '{}'::jsonb, true, '12:30'::time, ARRAY[1,2,3,4,5]),
    (_store_id, 'Estamos abertos', 'operational', '{nome_restaurante} está aberto!', NULL, 'store_open', 'Estamos abertos!', '/', false, 'open_now', 'auto', 'all_subscribers', 'preset', 'Estamos abertos!', '¡Estamos abiertos!', 'We''re open!', '{nome_restaurante} está aberto!', '¡{nome_restaurante} está abierto!', '{nome_restaurante} is open!', 'customer_last', '{}'::jsonb, true, NULL::time, NULL::integer[]),
    (_store_id, 'Fecha em breve', 'operational', 'Fechamos em breve!', NULL, 'store_open', 'Última chamada', '/', false, 'closed_soon', 'auto', 'all_subscribers', 'preset', 'Última chamada', 'Última llamada', 'Last call', 'Fechamos em breve!', 'Cerramos pronto!', 'Closing soon!', 'customer_last', '{"closing_soon_minutes":30}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Ciclo Boas-vindas 30 dias', 'lifecycle', 'Mensagens automáticas nos primeiros 30 dias.', NULL, 'lifecycle_welcome', 'Boas-vindas', '/', true, 'lifecycle_welcome', 'auto', 'lifecycle_welcome', 'preset', 'Boas-vindas', 'Bienvenida', 'Welcome', 'Calendário automático de boas-vindas.', 'Calendario automático de bienvenida.', 'Automatic welcome calendar.', 'customer_last', '{"mandatory":true,"slots_per_day":4}'::jsonb, false, NULL::time, NULL::integer[]),
    (_store_id, 'Ciclo Relação', 'lifecycle', 'Mensagens de ligação após os 30 dias iniciais.', NULL, 'lifecycle_relation', 'Relação', '/', true, 'lifecycle_relation', 'auto', 'lifecycle_relation', 'preset', 'Relação', 'Relación', 'Relationship', 'Calendário automático de relação.', 'Calendario automático de relación.', 'Automatic relationship calendar.', 'customer_last', '{"mandatory":true,"slots_per_day":4}'::jsonb, false, NULL::time, NULL::integer[])
  ) AS v(store_id, name, campaign_type, message_template, trigger_days, trigger_event, title, push_url, is_active, preset_key, send_mode, audience_type, origin, title_pt, title_es, title_en, message_pt, message_es, message_en, language_mode, audience_config, only_when_open, schedule_time, schedule_days)
  ON CONFLICT (store_id, preset_key) WHERE preset_key IS NOT NULL DO UPDATE SET
    is_active = CASE
      WHEN EXCLUDED.preset_key IN ('lifecycle_welcome', 'lifecycle_relation', 'winback_30d', 'winback_60d')
        THEN true
      ELSE public.marketing_campaigns.is_active
    END,
    audience_config = EXCLUDED.audience_config,
    trigger_event = EXCLUDED.trigger_event,
    campaign_type = EXCLUDED.campaign_type;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  SELECT count(*)::integer INTO v_mandatory
  FROM public.marketing_campaigns
  WHERE store_id = _store_id
    AND preset_key IN ('lifecycle_welcome', 'lifecycle_relation', 'winback_30d', 'winback_60d')
    AND is_active = true;

  UPDATE public.tenant_marketing_settings
  SET presets_installed = true, auto_campaigns_enabled = true, updated_at = now()
  WHERE tenant_id = v_tenant_id;

  INSERT INTO public.customer_marketing_lifecycle (store_id, customer_phone, stage, started_at, welcome_ends_at, relation_ends_at)
  SELECT cfo.store_id, trim(cfo.customer_phone), 'welcome', cfo.first_order_at, cfo.first_order_at + interval '30 days', cfo.first_order_at + interval '90 days'
  FROM public.customer_first_orders cfo
  WHERE cfo.store_id = _store_id
  ON CONFLICT (store_id, customer_phone) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'inserted', v_count, 'mandatory_active', v_mandatory);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_mandatory_marketing_campaigns(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketing_campaigns mc
  SET is_active = true, updated_at = now()
  FROM public.stores s
  WHERE s.id = mc.store_id
    AND s.tenant_id = _tenant_id
    AND mc.preset_key IN ('lifecycle_welcome', 'lifecycle_relation', 'winback_30d', 'winback_60d');
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_marketing_settings_activate_mandatory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.push_enabled = true)
     OR (TG_OP = 'UPDATE' AND NEW.push_enabled = true AND (OLD.push_enabled IS DISTINCT FROM true OR OLD.auto_campaigns_enabled IS DISTINCT FROM NEW.auto_campaigns_enabled)) THEN
    PERFORM public.sync_mandatory_marketing_campaigns(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_marketing_mandatory ON public.tenant_marketing_settings;
CREATE TRIGGER trg_tenant_marketing_mandatory
  AFTER INSERT OR UPDATE OF push_enabled, auto_campaigns_enabled ON public.tenant_marketing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tenant_marketing_settings_activate_mandatory();

GRANT SELECT ON public.customer_marketing_lifecycle TO authenticated, service_role;
GRANT SELECT ON public.lifecycle_send_log TO authenticated, service_role;
