-- Staff order push: device locale per subscription + richer localized alerts.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_locale text;

COMMENT ON COLUMN public.push_subscriptions.device_locale IS
  'Idioma do dispositivo (pt/es/en) no momento do registo push.';

CREATE OR REPLACE FUNCTION public.register_native_push_subscription(
  _store_id uuid,
  _fcm_token text,
  _platform text DEFAULT 'android',
  _customer_phone text DEFAULT '__staff__',
  _order_id uuid DEFAULT NULL,
  _device_locale text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform text;
  v_token text;
  v_endpoint text;
  v_phone text;
  v_locale text;
BEGIN
  IF _store_id IS NULL OR NULLIF(trim(_fcm_token), '') IS NULL THEN
    RAISE EXCEPTION 'Token push em falta';
  END IF;

  v_token := lower(trim(_fcm_token));
  v_platform := lower(COALESCE(NULLIF(trim(_platform), ''), 'android'));
  IF v_platform NOT IN ('android', 'ios') THEN
    RAISE EXCEPTION 'Plataforma inválida';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  v_phone := COALESCE(NULLIF(trim(_customer_phone), ''), '__staff__');
  v_locale := lower(COALESCE(NULLIF(trim(_device_locale), ''), 'es'));

  IF v_phone = '__staff__' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Login necessário para alertas da equipa';
    END IF;
    IF NOT (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR public.user_can_access_store(_store_id)
    ) THEN
      RAISE EXCEPTION 'Sem permissão para esta loja';
    END IF;

    DELETE FROM public.push_subscriptions
    WHERE store_id = _store_id
      AND customer_phone = '__staff__'
      AND platform = v_platform
      AND endpoint <> 'fcm://' || v_token;
  END IF;

  v_endpoint := 'fcm://' || v_token;

  INSERT INTO public.push_subscriptions (
    store_id,
    order_id,
    customer_phone,
    endpoint,
    platform,
    fcm_token,
    p256dh,
    auth,
    device_locale
  ) VALUES (
    _store_id,
    _order_id,
    v_phone,
    v_endpoint,
    v_platform,
    v_token,
    NULL,
    NULL,
    v_locale
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    order_id = EXCLUDED.order_id,
    customer_phone = EXCLUDED.customer_phone,
    platform = EXCLUDED.platform,
    fcm_token = EXCLUDED.fcm_token,
    device_locale = EXCLUDED.device_locale;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_native_push_subscription(uuid, text, text, text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_push_subscription(
  _store_id uuid,
  _order_id uuid DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _endpoint text DEFAULT NULL,
  _p256dh text DEFAULT NULL,
  _auth text DEFAULT NULL,
  _device_locale text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locale text;
BEGIN
  IF _store_id IS NULL OR _endpoint IS NULL OR _p256dh IS NULL OR _auth IS NULL THEN
    RAISE EXCEPTION 'Dados de subscrição incompletos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  v_locale := lower(COALESCE(NULLIF(trim(_device_locale), ''), 'es'));

  INSERT INTO public.push_subscriptions (
    store_id, order_id, customer_phone, endpoint, p256dh, auth, platform, fcm_token, device_locale
  ) VALUES (
    _store_id,
    _order_id,
    NULLIF(trim(_customer_phone), ''),
    _endpoint,
    _p256dh,
    _auth,
    'web',
    NULL,
    v_locale
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    order_id = EXCLUDED.order_id,
    customer_phone = EXCLUDED.customer_phone,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    platform = 'web',
    fcm_token = NULL,
    device_locale = EXCLUDED.device_locale;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_subscription(uuid, uuid, text, text, text, text, text) TO anon, authenticated;

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
      'staffOrderId', _order_id,
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
