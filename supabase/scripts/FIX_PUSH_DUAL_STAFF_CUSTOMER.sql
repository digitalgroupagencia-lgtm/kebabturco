-- Um telemóvel pode ser equipa E cliente ao mesmo tempo (staff_alerts + telefone do pedido).

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS staff_alerts boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.push_subscriptions.staff_alerts IS
  'Recebe alertas da equipa (novos pedidos no painel). Independente do telefone de cliente.';

UPDATE public.push_subscriptions
SET staff_alerts = true
WHERE customer_phone = '__staff__';

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
  v_is_staff_reg boolean;
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
  v_is_staff_reg := v_phone = '__staff__';

  IF v_is_staff_reg THEN
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
      AND staff_alerts = true
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
    device_locale,
    staff_alerts
  ) VALUES (
    _store_id,
    CASE WHEN v_is_staff_reg THEN NULL ELSE _order_id END,
    v_phone,
    v_endpoint,
    v_platform,
    v_token,
    NULL,
    NULL,
    v_locale,
    v_is_staff_reg
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    staff_alerts = push_subscriptions.staff_alerts OR EXCLUDED.staff_alerts,
    customer_phone = CASE
      WHEN NOT v_is_staff_reg AND NULLIF(trim(EXCLUDED.customer_phone), '') IS NOT NULL
        THEN EXCLUDED.customer_phone
      WHEN push_subscriptions.customer_phone IS NOT NULL
        AND push_subscriptions.customer_phone NOT IN ('__staff__')
        THEN push_subscriptions.customer_phone
      WHEN v_is_staff_reg THEN COALESCE(push_subscriptions.customer_phone, '__staff__')
      ELSE EXCLUDED.customer_phone
    END,
    order_id = CASE
      WHEN NOT v_is_staff_reg AND EXCLUDED.order_id IS NOT NULL THEN EXCLUDED.order_id
      ELSE push_subscriptions.order_id
    END,
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
  v_phone text;
  v_is_staff_reg boolean;
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
  v_phone := COALESCE(NULLIF(trim(_customer_phone), ''), '__staff__');
  v_is_staff_reg := v_phone = '__staff__';

  IF v_is_staff_reg THEN
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

  INSERT INTO public.push_subscriptions (
    store_id, order_id, customer_phone, endpoint, p256dh, auth, platform, fcm_token, device_locale, staff_alerts
  ) VALUES (
    _store_id,
    CASE WHEN v_is_staff_reg THEN NULL ELSE _order_id END,
    v_phone,
    _endpoint,
    _p256dh,
    _auth,
    'web',
    NULL,
    v_locale,
    v_is_staff_reg
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    staff_alerts = push_subscriptions.staff_alerts OR EXCLUDED.staff_alerts,
    customer_phone = CASE
      WHEN NOT v_is_staff_reg AND NULLIF(trim(EXCLUDED.customer_phone), '') IS NOT NULL
        THEN EXCLUDED.customer_phone
      WHEN push_subscriptions.customer_phone IS NOT NULL
        AND push_subscriptions.customer_phone NOT IN ('__staff__')
        THEN push_subscriptions.customer_phone
      WHEN v_is_staff_reg THEN COALESCE(push_subscriptions.customer_phone, '__staff__')
      ELSE EXCLUDED.customer_phone
    END,
    order_id = CASE
      WHEN NOT v_is_staff_reg AND EXCLUDED.order_id IS NOT NULL THEN EXCLUDED.order_id
      ELSE push_subscriptions.order_id
    END,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    platform = 'web',
    fcm_token = NULL,
    device_locale = EXCLUDED.device_locale;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_subscription(uuid, uuid, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.unregister_staff_push_subscription(_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NULLIF(trim(_endpoint), '') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.push_subscriptions
  SET
    staff_alerts = false,
    customer_phone = CASE
      WHEN customer_phone = '__staff__' THEN NULL
      ELSE customer_phone
    END
  WHERE endpoint = trim(_endpoint);

  DELETE FROM public.push_subscriptions
  WHERE endpoint = trim(_endpoint)
    AND staff_alerts = false
    AND order_id IS NULL
    AND (
      customer_phone IS NULL
      OR customer_phone IN ('__staff__', '')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unregister_staff_push_subscription(text) TO anon, authenticated;
