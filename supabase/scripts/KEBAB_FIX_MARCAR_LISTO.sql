-- =====================================================================
-- Correr no SQL Editor do KEBAB TURCO (Lovable → Cloud → SQL).
-- Corrige erro ao carregar "Marcar listo" / avançar pedido no painel ao vivo.
-- Erro típico: duplicate key value violates unique constraint "uq_flow_queue_order_event"
-- =====================================================================

DELETE FROM public.flow_webhook_queue a
USING public.flow_webhook_queue b
WHERE a.id > b.id
  AND a.order_id = b.order_id
  AND a.event_type = b.event_type;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_flow_queue_order_event'
      AND conrelid = 'public.flow_webhook_queue'::regclass
  ) THEN
    ALTER TABLE public.flow_webhook_queue
      ADD CONSTRAINT uq_flow_queue_order_event UNIQUE (order_id, event_type);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
  ON CONFLICT ON CONSTRAINT uq_flow_queue_order_event
  DO UPDATE SET
    status = 'pending',
    attempts = 0,
    last_error = NULL,
    sent_at = NULL,
    created_at = now();
END;
$$;

SELECT 'OK — podes voltar ao painel e carregar em Marcar listo' AS resultado;
