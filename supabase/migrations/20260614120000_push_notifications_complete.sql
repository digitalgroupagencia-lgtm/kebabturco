-- Push completo: remove trigger duplicado, registo FCM nativo, avisos cliente no servidor, campanhas diárias.

-- 1. Remover trigger legado (disparava em todo INSERT sem regras de pagamento)
DROP TRIGGER IF EXISTS trg_notify_staff_new_order ON public.orders;
DROP FUNCTION IF EXISTS public.notify_staff_new_order();

-- 2. Staff push — dispara mesmo sem staff_push_secret (edge aceita se STAFF_PUSH_INTERNAL_SECRET vazio)
CREATE OR REPLACE FUNCTION public.dispatch_staff_new_order_push(
  _store_id uuid,
  _order_id uuid,
  _order_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.platform_push_config%ROWTYPE;
  v_headers jsonb;
BEGIN
  IF _store_id IS NULL OR _order_id IS NULL OR NULLIF(trim(_order_number), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF NULLIF(trim(v_cfg.staff_push_secret), '') IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-staff-push-secret', trim(v_cfg.staff_push_secret));
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/send-push-notification',
    headers := v_headers,
    body := jsonb_build_object(
      'storeId', _store_id,
      'title', 'Novo pedido #' || trim(_order_number),
      'body', 'Pedido recebido — abre o painel para ver detalhes',
      'tag', 'staff-new-order-' || _order_id::text,
      'url', '/panel/live',
      'requireInteraction', true
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_staff_new_order_push failed: %', SQLERRM;
END;
$$;

-- 3. Push cliente — fases do pedido (servidor, não depende do painel aberto)
CREATE OR REPLACE FUNCTION public.customer_order_push_message(
  _event text,
  _order_number text
) RETURNS TABLE(title text, body text)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  title := 'Pedido #' || COALESCE(NULLIF(trim(_order_number), ''), '?');

  body := CASE _event
    WHEN 'payment_paid' THEN 'Pagamento confirmado!'
    WHEN 'preparing' THEN 'O teu pedido está a ser preparado'
    WHEN 'ready' THEN 'O teu pedido está pronto!'
    WHEN 'out_for_delivery' THEN 'O teu pedido saiu para entrega'
    WHEN 'delivered' THEN 'Pedido entregue! Bom apetite!'
    WHEN 'collected' THEN 'Pedido recolhido!'
    WHEN 'served' THEN 'Pedido servido!'
    WHEN 'cancelled' THEN 'O teu pedido foi cancelado'
    WHEN 'pending' THEN 'Pedido recebido!'
    ELSE 'Actualização do teu pedido'
  END;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_customer_order_status_push(
  _order_id uuid,
  _event text,
  _order_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.platform_push_config%ROWTYPE;
  v_title text;
  v_body text;
BEGIN
  IF _order_id IS NULL OR NULLIF(trim(_event), '') IS NULL THEN
    RETURN;
  END IF;

  IF _event NOT IN (
    'payment_paid', 'preparing', 'ready', 'out_for_delivery',
    'delivered', 'collected', 'served', 'cancelled', 'pending'
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT m.title, m.body
  INTO v_title, v_body
  FROM public.customer_order_push_message(_event, _order_number) AS m;

  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'orderId', _order_id,
      'title', v_title,
      'body', v_body,
      'tag', 'order-' || _order_id::text,
      'url', '/?screen=tracking&order=' || _order_id::text
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_customer_order_status_push failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_customer_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status
     AND NEW.payment_status = 'paid'::public.payment_status THEN
    PERFORM public.dispatch_customer_order_status_push(NEW.id, 'payment_paid', NEW.order_number);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.dispatch_customer_order_status_push(NEW.id, NEW.status::text, NEW.order_number);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_customer_push_after_update ON public.orders;
CREATE TRIGGER orders_customer_push_after_update
  AFTER UPDATE OF status, payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_customer_push();

REVOKE ALL ON FUNCTION public.dispatch_customer_order_status_push(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_customer_order_status_push(uuid, text, text) TO service_role;

-- 4. Registo push nativo (FCM) — app Capacitor instalada
CREATE OR REPLACE FUNCTION public.register_native_push_subscription(
  _store_id uuid,
  _fcm_token text,
  _platform text DEFAULT 'android',
  _customer_phone text DEFAULT '__staff__'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform text;
  v_endpoint text;
BEGIN
  IF _store_id IS NULL OR NULLIF(trim(_fcm_token), '') IS NULL THEN
    RAISE EXCEPTION 'Token push em falta';
  END IF;

  v_platform := lower(COALESCE(NULLIF(trim(_platform), ''), 'android'));
  IF v_platform NOT IN ('android', 'ios') THEN
    RAISE EXCEPTION 'Plataforma inválida';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  IF _customer_phone = '__staff__' OR _customer_phone IS NULL OR trim(_customer_phone) = '' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Login necessário para alertas da equipa';
    END IF;
    IF NOT (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR public.user_can_access_store(_store_id)
    ) THEN
      RAISE EXCEPTION 'Sem permissão para esta loja';
    END IF;
  END IF;

  v_endpoint := 'fcm://' || trim(_fcm_token);

  INSERT INTO public.push_subscriptions (
    store_id,
    order_id,
    customer_phone,
    endpoint,
    platform,
    fcm_token,
    p256dh,
    auth
  ) VALUES (
    _store_id,
    NULL,
    COALESCE(NULLIF(trim(_customer_phone), ''), '__staff__'),
    v_endpoint,
    v_platform,
    trim(_fcm_token),
    NULL,
    NULL
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    customer_phone = EXCLUDED.customer_phone,
    platform = EXCLUDED.platform,
    fcm_token = EXCLUDED.fcm_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_native_push_subscription(uuid, text, text, text) TO authenticated;

-- Web push: marcar plataforma explicitamente
CREATE OR REPLACE FUNCTION public.register_push_subscription(
  _store_id uuid,
  _order_id uuid DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _endpoint text DEFAULT NULL,
  _p256dh text DEFAULT NULL,
  _auth text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _store_id IS NULL OR _endpoint IS NULL OR _p256dh IS NULL OR _auth IS NULL THEN
    RAISE EXCEPTION 'Dados de subscrição incompletos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  INSERT INTO public.push_subscriptions (
    store_id, order_id, customer_phone, endpoint, p256dh, auth, platform, fcm_token
  ) VALUES (
    _store_id,
    _order_id,
    NULLIF(trim(_customer_phone), ''),
    _endpoint,
    _p256dh,
    _auth,
    'web',
    NULL
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    order_id = EXCLUDED.order_id,
    customer_phone = EXCLUDED.customer_phone,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    platform = 'web',
    fcm_token = NULL;
END;
$$;

-- 5. Campanhas automáticas — pg_cron diário (10:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'kebabturco-marketing-campaigns-daily'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'kebabturco-marketing-campaigns-daily',
    '0 10 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/run-marketing-campaigns',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"cron": true}'::jsonb
    );
    $cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron schedule skipped: %', SQLERRM;
END;
$$;
