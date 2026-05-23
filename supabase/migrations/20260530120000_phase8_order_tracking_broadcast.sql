-- Fase 8 — Acompanhamento do cliente em tempo real (sem reabrir SELECT anónimo em orders)

CREATE OR REPLACE FUNCTION public.broadcast_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.estimated_ready_at IS DISTINCT FROM NEW.estimated_ready_at
  ) THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', NEW.id,
        'status', NEW.status,
        'order_number', NEW.order_number,
        'order_type', NEW.order_type,
        'estimated_ready_at', NEW.estimated_ready_at,
        'total', NEW.total
      ),
      'status_update',
      'order:' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_status_broadcast ON public.orders;
CREATE TRIGGER orders_status_broadcast
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_order_status_change();

COMMENT ON FUNCTION public.broadcast_order_status_change() IS
  'Broadcast público de mudanças de status — totem acompanhar pedido sem SELECT anónimo na tabela orders.';
