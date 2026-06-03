
-- 1. Suporte FCM nativo na tabela push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS fcm_token text;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

CREATE INDEX IF NOT EXISTS push_subscriptions_store_platform_idx
  ON public.push_subscriptions(store_id, platform);

-- 2. Garantir extensão pg_net (para chamadas HTTP a edge functions a partir de triggers)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Função que faz POST à edge function send-push-notification
CREATE OR REPLACE FUNCTION public.notify_staff_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_service_key text;
  v_internal_secret text;
  v_payload jsonb;
BEGIN
  -- só dispara em pedidos novos (não em re-inserts artificiais)
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  IF NEW.store_id IS NULL THEN RETURN NEW; END IF;

  v_url := 'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/send-push-notification';
  v_service_key := current_setting('app.settings.service_role_key', true);
  v_internal_secret := current_setting('app.settings.staff_push_secret', true);

  v_payload := jsonb_build_object(
    'storeId', NEW.store_id::text,
    'title', 'Nuevo pedido #' || NEW.order_number,
    'body', 'Pedido recibido — abre el panel para ver detalles',
    'tag', 'staff-new-order-' || NEW.id::text,
    'url', '/panel/live',
    'requireInteraction', true
  );

  PERFORM extensions.http_post(
    url := v_url,
    body := v_payload::text,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-staff-push-secret', COALESCE(v_internal_secret, ''),
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    timeout_milliseconds := 4000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- nunca bloqueia o insert do pedido
  RAISE WARNING 'notify_staff_new_order failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Trigger no insert de orders
DROP TRIGGER IF EXISTS trg_notify_staff_new_order ON public.orders;
CREATE TRIGGER trg_notify_staff_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_new_order();
