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
    order_id = CASE
      WHEN push_subscriptions.customer_phone = '__staff__' AND EXCLUDED.customer_phone <> '__staff__'
        THEN push_subscriptions.order_id
      ELSE EXCLUDED.order_id
    END,
    customer_phone = CASE
      WHEN push_subscriptions.customer_phone = '__staff__' AND EXCLUDED.customer_phone <> '__staff__'
        THEN push_subscriptions.customer_phone
      ELSE EXCLUDED.customer_phone
    END,
    platform = EXCLUDED.platform,
    fcm_token = EXCLUDED.fcm_token,
    device_locale = EXCLUDED.device_locale;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_native_push_subscription(uuid, text, text, text, uuid, text) TO anon, authenticated;