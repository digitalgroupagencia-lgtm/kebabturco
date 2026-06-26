-- Ponte Kebab Turco ↔ WGM PDV (NexusOps)
-- Envia pedidos pagos ao marketplace-webhook do WGM e recebe actualizações de estado.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Configuração global (singleton)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wgm_integration_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  marketplace_webhook_url text NOT NULL DEFAULT 'https://giqqsqauirokzgraqobh.supabase.co/functions/v1/marketplace-webhook',
  public_api_url text NOT NULL DEFAULT 'https://giqqsqauirokzgraqobh.supabase.co/functions/v1/public-api',
  tenant_slug text NOT NULL DEFAULT 'kebab-turco',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.wgm_integration_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.wgm_integration_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master manages wgm config" ON public.wgm_integration_config;
CREATE POLICY "Admin master manages wgm config"
  ON public.wgm_integration_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

DROP POLICY IF EXISTS "Service role wgm config" ON public.wgm_integration_config;
CREATE POLICY "Service role wgm config"
  ON public.wgm_integration_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Mapeamento loja Kebab → loja WGM
-- ---------------------------------------------------------------------------
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS flow_store_id uuid;

COMMENT ON COLUMN public.stores.flow_store_id IS 'UUID da loja correspondente no WGM PDV (NexusOps stores.id)';

-- ---------------------------------------------------------------------------
-- Fila de sincronização (schema alinhado com types Lovable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flow_webhook_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'order.paid',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_webhook_queue_pending
  ON public.flow_webhook_queue (created_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_webhook_queue_order_paid_once
  ON public.flow_webhook_queue (order_id)
  WHERE event_type = 'order.paid';

ALTER TABLE public.flow_webhook_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master reads flow queue" ON public.flow_webhook_queue;
CREATE POLICY "Admin master reads flow queue"
  ON public.flow_webhook_queue
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));

DROP POLICY IF EXISTS "Service role flow queue" ON public.flow_webhook_queue;
CREATE POLICY "Service role flow queue"
  ON public.flow_webhook_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Referências pedido Kebab ↔ pedido WGM
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wgm_order_refs (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  wgm_order_id uuid,
  wgm_order_numero integer,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  synced_at timestamptz,
  last_status_synced text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wgm_order_refs_wgm_id
  ON public.wgm_order_refs (wgm_order_id)
  WHERE wgm_order_id IS NOT NULL;

ALTER TABLE public.wgm_order_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin master reads wgm refs" ON public.wgm_order_refs;
CREATE POLICY "Admin master reads wgm refs"
  ON public.wgm_order_refs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));

DROP POLICY IF EXISTS "Service role wgm refs" ON public.wgm_order_refs;
CREATE POLICY "Service role wgm refs"
  ON public.wgm_order_refs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Enfileirar e despachar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_wgm_order_sync(
  _order_id uuid,
  _store_id uuid,
  _event_type text DEFAULT 'order.paid'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
BEGIN
  IF _order_id IS NULL OR _store_id IS NULL THEN
    RETURN;
  END IF;

  v_event := COALESCE(NULLIF(trim(_event_type), ''), 'order.paid');

  IF v_event = 'order.paid' THEN
    IF EXISTS (
      SELECT 1 FROM public.flow_webhook_queue
      WHERE order_id = _order_id AND event_type = 'order.paid'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.flow_webhook_queue (order_id, store_id, event_type, status)
  VALUES (_order_id, _store_id, v_event, 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_wgm_sync(
  _order_id uuid,
  _event_type text DEFAULT 'order.paid'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.wgm_integration_config%ROWTYPE;
  v_push public.platform_push_config%ROWTYPE;
  v_headers jsonb;
  v_secret text;
BEGIN
  SELECT * INTO v_cfg FROM public.wgm_integration_config WHERE id = 1;
  IF NOT FOUND OR NOT v_cfg.enabled THEN
    RETURN;
  END IF;

  SELECT * INTO v_push FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND OR NULLIF(trim(v_push.functions_base_url), '') IS NULL THEN
    RETURN;
  END IF;

  v_secret := NULLIF(trim(current_setting('app.wgm_sync_secret', true)), '');
  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF v_secret IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-wgm-sync-secret', v_secret);
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_push.functions_base_url, '/') || '/wgm-sync-dispatch',
    headers := v_headers,
    body := jsonb_build_object(
      'order_id', _order_id,
      'event_type', COALESCE(NULLIF(trim(_event_type), ''), 'order.paid')
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_wgm_sync failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_wgm_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
BEGIN
  IF NEW.is_test THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'paid'::public.payment_status THEN
      PERFORM public.enqueue_wgm_order_sync(NEW.id, NEW.store_id, 'order.paid');
      PERFORM public.dispatch_wgm_sync(NEW.id, 'order.paid');
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status IS DISTINCT FROM 'paid'::public.payment_status
       AND NEW.payment_status = 'paid'::public.payment_status THEN
      PERFORM public.enqueue_wgm_order_sync(NEW.id, NEW.store_id, 'order.paid');
      PERFORM public.dispatch_wgm_sync(NEW.id, 'order.paid');
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status
       AND COALESCE(current_setting('wgm.inbound_sync', true), '') <> '1' THEN
      v_event := 'order.status';
      PERFORM public.enqueue_wgm_order_sync(NEW.id, NEW.store_id, v_event);
      PERFORM public.dispatch_wgm_sync(NEW.id, v_event);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_wgm_sync_after_insert ON public.orders;
CREATE TRIGGER orders_wgm_sync_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_wgm_sync();

DROP TRIGGER IF EXISTS orders_wgm_sync_after_update ON public.orders;
CREATE TRIGGER orders_wgm_sync_after_update
  AFTER UPDATE OF payment_status, status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_wgm_sync();

-- ---------------------------------------------------------------------------
-- Aplicar estado vindo do WGM (evita loop de outbound)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wgm_apply_inbound_status(
  _external_id uuid,
  _status text,
  _wgm_order_id uuid DEFAULT NULL,
  _wgm_order_numero integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_new_status public.order_status;
  v_prop text;
BEGIN
  IF _external_id IS NULL OR NULLIF(trim(_status), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_params');
  END IF;

  v_prop := lower(trim(_status));

  v_new_status := CASE v_prop
    WHEN 'received' THEN 'pending'::public.order_status
    WHEN 'accepted' THEN 'pending'::public.order_status
    WHEN 'preparing' THEN 'preparing'::public.order_status
    WHEN 'ready' THEN 'ready'::public.order_status
    WHEN 'out_for_delivery' THEN 'out_for_delivery'::public.order_status
    WHEN 'delivered' THEN 'delivered'::public.order_status
    WHEN 'cancelled' THEN 'cancelled'::public.order_status
    WHEN 'refunded' THEN 'cancelled'::public.order_status
    WHEN 'pending' THEN 'pending'::public.order_status
    WHEN 'collected' THEN 'delivered'::public.order_status
    WHEN 'served' THEN 'delivered'::public.order_status
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_status', 'status', _status);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _external_id LIMIT 1;
  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  PERFORM set_config('wgm.inbound_sync', '1', true);

  UPDATE public.orders
  SET status = v_new_status,
      updated_at = now()
  WHERE id = _external_id
    AND status IS DISTINCT FROM v_new_status;

  INSERT INTO public.wgm_order_refs (order_id, wgm_order_id, wgm_order_numero, store_id, last_status_synced, updated_at)
  VALUES (_external_id, _wgm_order_id, _wgm_order_numero, v_order.store_id, v_prop, now())
  ON CONFLICT (order_id) DO UPDATE SET
    wgm_order_id = COALESCE(EXCLUDED.wgm_order_id, wgm_order_refs.wgm_order_id),
    wgm_order_numero = COALESCE(EXCLUDED.wgm_order_numero, wgm_order_refs.wgm_order_numero),
    last_status_synced = EXCLUDED.last_status_synced,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _external_id,
    'status', v_new_status::text,
    'previous', v_order.status::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_wgm_order_sync(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_wgm_sync(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wgm_apply_inbound_status(uuid, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_wgm_order_sync(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_wgm_sync(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wgm_apply_inbound_status(uuid, text, uuid, integer) TO service_role;

DROP TRIGGER IF EXISTS update_wgm_integration_config_updated_at ON public.wgm_integration_config;
CREATE TRIGGER update_wgm_integration_config_updated_at
  BEFORE UPDATE ON public.wgm_integration_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wgm_order_refs_updated_at ON public.wgm_order_refs;
CREATE TRIGGER update_wgm_order_refs_updated_at
  BEFORE UPDATE ON public.wgm_order_refs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Retry automático da fila WGM (a cada 3 minutos)
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron não disponível — use o botão Processar fila no admin';
    RETURN;
  END IF;

  FOR v_job_id IN
    SELECT jobid FROM cron.job WHERE jobname = 'kebabturco-wgm-sync-retry'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'kebabturco-wgm-sync-retry',
    '*/3 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/wgm-sync-dispatch',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"limit": 15}'::jsonb
    );
    $cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron wgm sync skipped: %', SQLERRM;
END;
$$;
