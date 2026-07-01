-- Corrigir definitivamente erro duplicate key em flow_webhook_queue
-- e impedir que a sincronização externa bloqueie o fluxo operacional.

-- 1) Limpar qualquer duplicado antigo antes de reforçar a lógica.
DELETE FROM public.flow_webhook_queue a
USING public.flow_webhook_queue b
WHERE a.id > b.id
  AND a.order_id = b.order_id
  AND a.event_type = b.event_type;

-- 2) Garantir unicidade por pedido + evento.
CREATE UNIQUE INDEX IF NOT EXISTS uq_flow_queue_order_event
  ON public.flow_webhook_queue (order_id, event_type);

-- 3) Função idempotente: cria ou reutiliza o evento da fila.
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

  INSERT INTO public.flow_webhook_queue (order_id, store_id, event_type, status)
  VALUES (_order_id, _store_id, v_event, 'pending')
  ON CONFLICT (order_id, event_type)
  DO UPDATE SET
    store_id = EXCLUDED.store_id,
    status = 'pending',
    attempts = 0,
    last_error = NULL,
    sent_at = NULL,
    created_at = now();
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.flow_webhook_queue
    SET store_id = _store_id,
        status = 'pending',
        attempts = 0,
        last_error = NULL,
        sent_at = NULL,
        created_at = now()
    WHERE order_id = _order_id
      AND event_type = v_event;
END;
$$;

-- 4) Trigger resiliente: nunca bloqueia a atualização do pedido por causa do Flow.
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
      BEGIN
        PERFORM public.enqueue_wgm_order_sync(NEW.id, NEW.store_id, 'order.paid');
        PERFORM public.dispatch_wgm_sync(NEW.id, 'order.paid');
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'wgm sync insert paid skipped: %', SQLERRM;
      END;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status IS DISTINCT FROM 'paid'::public.payment_status
       AND NEW.payment_status = 'paid'::public.payment_status THEN
      BEGIN
        PERFORM public.enqueue_wgm_order_sync(NEW.id, NEW.store_id, 'order.paid');
        PERFORM public.dispatch_wgm_sync(NEW.id, 'order.paid');
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'wgm sync paid skipped: %', SQLERRM;
      END;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status
       AND COALESCE(current_setting('wgm.inbound_sync', true), '') <> '1' THEN
      BEGIN
        v_event := 'order.status';
        PERFORM public.enqueue_wgm_order_sync(NEW.id, NEW.store_id, v_event);
        PERFORM public.dispatch_wgm_sync(NEW.id, v_event);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'wgm sync status skipped: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;