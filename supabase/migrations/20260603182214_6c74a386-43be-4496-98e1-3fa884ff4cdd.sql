
-- Recriar enqueue_print_job com parâmetro _force_reprint (compatibilidade frontend)
DROP FUNCTION IF EXISTS public.enqueue_print_job(text, uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.enqueue_print_job(text, uuid, uuid, integer, boolean);

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
  _enabled boolean;
  _job_id uuid;
  _already_printed timestamptz;
BEGIN
  SELECT ip_address, port, printer_copies, enabled
    INTO _ip, _port, _copies, _enabled
  FROM public.printer_settings
  WHERE store_id = _store_id
  LIMIT 1;

  IF _enabled IS NOT NULL AND _enabled = false THEN
    RAISE EXCEPTION 'Impressora desactivada para esta unidade';
  END IF;

  _ip := COALESCE(_ip, '192.168.1.200');
  _port := COALESCE(_port, 9100);
  _copies := COALESCE(_copies_override, _copies, 1);

  -- Dedup: se já foi impresso e não é reimpressão forçada, retorna job existente
  IF _order_id IS NOT NULL AND NOT _force_reprint THEN
    SELECT kitchen_printed_at INTO _already_printed
    FROM public.orders WHERE id = _order_id;
    IF _already_printed IS NOT NULL THEN
      SELECT id INTO _job_id FROM public.print_jobs
      WHERE order_id = _order_id ORDER BY created_at DESC LIMIT 1;
      IF _job_id IS NOT NULL THEN RETURN _job_id; END IF;
    END IF;

    SELECT id INTO _job_id FROM public.print_jobs
    WHERE order_id = _order_id AND status IN ('pending','printing')
    LIMIT 1;
    IF _job_id IS NOT NULL THEN RETURN _job_id; END IF;
  END IF;

  INSERT INTO public.print_jobs (store_id, order_id, printer_ip, printer_port, ticket_data, copies, status)
  VALUES (_store_id, _order_id, _ip, _port, _ticket_data, _copies, 'pending')
  RETURNING id INTO _job_id;

  IF _order_id IS NOT NULL THEN
    UPDATE public.orders
    SET kitchen_printed_at = COALESCE(kitchen_printed_at, now()), updated_at = now()
    WHERE id = _order_id;
  END IF;

  RETURN _job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_print_job(text, uuid, uuid, integer, boolean) TO authenticated, anon, service_role;

-- Função para reenviar jobs falhados
CREATE OR REPLACE FUNCTION public.retry_failed_print_jobs(_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  UPDATE public.print_jobs
  SET status = 'pending', error_message = NULL, updated_at = now()
  WHERE store_id = _store_id AND status = 'failed';
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.retry_failed_print_jobs(uuid) TO authenticated, service_role;

-- Forçar reload do schema cache PostgREST
NOTIFY pgrst, 'reload schema';
