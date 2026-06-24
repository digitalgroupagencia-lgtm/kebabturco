-- Push hardening: token normalization, stale native cleanup, dispatch readiness probe.

-- 1. Normalizar tokens nativos existentes (evita duplicados por maiúsculas/minúsculas)
UPDATE public.push_subscriptions
SET
  fcm_token = lower(trim(fcm_token)),
  endpoint = 'fcm://' || lower(trim(fcm_token))
WHERE platform IN ('ios', 'android')
  AND fcm_token IS NOT NULL
  AND fcm_token <> lower(trim(fcm_token));

-- Heurística: endpoints fcm com 64 hex chars sem platform ios/android
UPDATE public.push_subscriptions
SET platform = 'ios'
WHERE platform = 'web'
  AND endpoint ~ '^fcm://[0-9a-fA-F]{64}$';

-- 2. Registo nativo: lowercase + remover tokens antigos da mesma equipa/loja
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
  v_token text;
  v_endpoint text;
  v_phone text;
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
    auth
  ) VALUES (
    _store_id,
    NULL,
    v_phone,
    v_endpoint,
    v_platform,
    v_token,
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

-- 3. Diagnóstico: pedidos automáticos da equipa precisam do segredo alinhado com a Edge Function
CREATE OR REPLACE FUNCTION public.get_push_dispatch_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'staffSecretConfigured', NULLIF(trim(staff_push_secret), '') IS NOT NULL,
        'functionsBaseUrl', functions_base_url,
        'iosSubscriptions', (
          SELECT count(*)::int FROM public.push_subscriptions ps
          WHERE ps.platform = 'ios' AND ps.customer_phone = '__staff__'
        ),
        'androidSubscriptions', (
          SELECT count(*)::int FROM public.push_subscriptions ps
          WHERE ps.platform = 'android' AND ps.customer_phone = '__staff__'
        )
      )
      FROM public.platform_push_config
      WHERE id = 1
    ),
    jsonb_build_object('staffSecretConfigured', false, 'functionsBaseUrl', null)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_push_dispatch_status() TO authenticated;
