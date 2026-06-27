CREATE OR REPLACE FUNCTION public.enqueue_print_job(_ticket_data text, _store_id uuid, _order_id uuid DEFAULT NULL::uuid, _copies_override integer DEFAULT NULL::integer, _force_reprint boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ip text;
  _port integer;
  _copies integer;
  _enabled boolean;
  _job_id uuid;
  _already_printed timestamptz;
BEGIN
  -- Lock por pedido para evitar enfileiramento duplicado em paralelo
  IF _order_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(_order_id::text, 0));
  END IF;

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

  -- Dedup: se já existe qualquer job para este pedido e não é reimpressão forçada, devolve o existente
  IF _order_id IS NOT NULL AND NOT _force_reprint THEN
    SELECT kitchen_printed_at INTO _already_printed
    FROM public.orders WHERE id = _order_id;
    IF _already_printed IS NOT NULL THEN
      SELECT id INTO _job_id FROM public.print_jobs
      WHERE order_id = _order_id ORDER BY created_at DESC LIMIT 1;
      IF _job_id IS NOT NULL THEN RETURN _job_id; END IF;
    END IF;

    SELECT id INTO _job_id FROM public.print_jobs
    WHERE order_id = _order_id
    ORDER BY created_at DESC LIMIT 1;
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
$function$;