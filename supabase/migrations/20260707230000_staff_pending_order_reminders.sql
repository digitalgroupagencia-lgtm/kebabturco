-- Reenvia push de novo pedido enquanto status = pending (som no iPhone em segundo plano).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS staff_push_last_reminder_at timestamptz;

COMMENT ON COLUMN public.orders.staff_push_last_reminder_at IS
  'Último lembrete push à equipa para pedido ainda em «Recebido».';

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

  UPDATE public.orders
  SET staff_push_last_reminder_at = now()
  WHERE id = _order_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_staff_new_order_push failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.remind_staff_pending_order_pushes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_day_start timestamptz;
BEGIN
  v_day_start := date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid';

  FOR v_order IN
    SELECT o.id, o.store_id, o.order_number
    FROM public.orders o
    WHERE o.status = 'pending'::public.order_status
      AND o.created_at >= v_day_start
      AND public.order_should_notify_staff_on_panel(o)
      AND (
        o.staff_push_last_reminder_at IS NULL
        OR o.staff_push_last_reminder_at < now() - interval '25 seconds'
      )
  LOOP
    PERFORM public.dispatch_staff_new_order_push(
      v_order.store_id,
      v_order.id,
      v_order.order_number::text
    );
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'remind_staff_pending_order_pushes failed: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron não disponível — configure lembrete de pedidos pendentes manualmente';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'staff-pending-order-reminders';

  PERFORM cron.schedule(
    'staff-pending-order-reminders',
    '* * * * *',
    $cron$SELECT public.remind_staff_pending_order_pushes();$cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'staff pending reminders cron skipped: %', SQLERRM;
END;
$$;
