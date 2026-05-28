-- Estabilização impressão multi-loja: heartbeat, retry, mark_kitchen_printed, dedup enqueue

-- Retry fields on print_jobs
ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_print_jobs_store_pending
  ON public.print_jobs (store_id, status, next_retry_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_print_jobs_order_active
  ON public.print_jobs (order_id)
  WHERE order_id IS NOT NULL AND status IN ('pending', 'printing');

-- Bridge heartbeat (1 row per store)
CREATE TABLE IF NOT EXISTS public.print_bridge_heartbeats (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  bridge_version text,
  printer_ip text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.print_bridge_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members read print_bridge_heartbeats" ON public.print_bridge_heartbeats;
CREATE POLICY "Tenant members read print_bridge_heartbeats"
  ON public.print_bridge_heartbeats FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP TRIGGER IF EXISTS update_print_bridge_heartbeats_updated_at ON public.print_bridge_heartbeats;
CREATE TRIGGER update_print_bridge_heartbeats_updated_at
  BEFORE UPDATE ON public.print_bridge_heartbeats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.print_bridge_heartbeats IS
  'Heartbeat do Print Bridge local por loja. Bridge usa service role para upsert.';

COMMENT ON TABLE public.printer_settings IS
  'Fonte oficial de impressoras LAN por store_id (IP, porta, enabled, cópias).';

COMMENT ON TABLE public.printers IS
  'LEGADO — não usado no fluxo print_jobs. Ver printer_settings.';

COMMENT ON TABLE public.printer_category_map IS
  'LEGADO — não usado no fluxo print_jobs. Ver printer_settings.';

-- Marca pedido como impresso só após job concluído no bridge
CREATE OR REPLACE FUNCTION public.mark_kitchen_printed(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated boolean := false;
BEGIN
  UPDATE public.orders
  SET kitchen_printed_at = now(), updated_at = now()
  WHERE id = _order_id AND kitchen_printed_at IS NULL;

  GET DIAGNOSTICS _updated = ROW_COUNT > 0;
  RETURN _updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_kitchen_printed(uuid) TO anon, authenticated, service_role;

-- Heartbeat upsert (bridge local)
CREATE OR REPLACE FUNCTION public.upsert_print_bridge_heartbeat(
  _store_id uuid,
  _bridge_version text DEFAULT NULL,
  _printer_ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.print_bridge_heartbeats (store_id, last_seen_at, bridge_version, printer_ip)
  VALUES (_store_id, now(), _bridge_version, _printer_ip)
  ON CONFLICT (store_id) DO UPDATE SET
    last_seen_at = now(),
    bridge_version = COALESCE(EXCLUDED.bridge_version, print_bridge_heartbeats.bridge_version),
    printer_ip = COALESCE(EXCLUDED.printer_ip, print_bridge_heartbeats.printer_ip),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_print_bridge_heartbeat(uuid, text, text) TO anon, authenticated, service_role;

-- Re-enfileira jobs failed elegíveis para retry manual ou automático
CREATE OR REPLACE FUNCTION public.retry_failed_print_jobs(_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  UPDATE public.print_jobs
  SET
    status = 'pending',
    retry_count = 0,
    next_retry_at = NULL,
    error_message = NULL,
    updated_at = now()
  WHERE store_id = _store_id
    AND status = 'failed'
    AND retry_count >= max_retries;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retry_failed_print_jobs(uuid) TO authenticated, service_role;

-- enqueue_print_job com dedup e force reprint
CREATE OR REPLACE FUNCTION public.enqueue_print_job(
  _ticket_data text,
  _store_id uuid,
  _order_id uuid DEFAULT NULL,
  _copies_override integer DEFAULT NULL,
  _force_reprint boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ip text;
  _port integer;
  _copies integer;
  _job_id uuid;
  _existing_id uuid;
BEGIN
  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;

  IF _order_id IS NOT NULL AND NOT COALESCE(_force_reprint, false) THEN
    SELECT id INTO _existing_id
    FROM public.print_jobs
    WHERE order_id = _order_id
      AND status IN ('pending', 'printing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
      RETURN _existing_id;
    END IF;
  END IF;

  SELECT ip_address, port, printer_copies
    INTO _ip, _port, _copies
  FROM public.printer_settings
  WHERE store_id = _store_id
  LIMIT 1;

  _ip := COALESCE(_ip, '192.168.1.200');
  _port := COALESCE(_port, 9100);
  _copies := COALESCE(_copies_override, _copies, 1);

  INSERT INTO public.print_jobs (
    store_id, order_id, printer_ip, printer_port, ticket_data, copies, status,
    retry_count, max_retries, next_retry_at
  )
  VALUES (
    _store_id, _order_id, _ip, _port, _ticket_data, _copies, 'pending',
    0, 3, NULL
  )
  RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_print_job(text, uuid, uuid, integer, boolean) TO anon, authenticated, service_role;

-- claim_kitchen_print: deprecated — não marca mais antes da impressão real
CREATE OR REPLACE FUNCTION public.claim_kitchen_print(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compatibilidade: indica se ainda não foi impresso (bridge marca via mark_kitchen_printed)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = _order_id AND kitchen_printed_at IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_kitchen_print(uuid) TO anon, authenticated, service_role;
