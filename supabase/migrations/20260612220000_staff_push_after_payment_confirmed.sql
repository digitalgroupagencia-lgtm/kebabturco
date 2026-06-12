-- Push da equipa: só quando o pedido deve aparecer no painel (dinheiro/balcão ou pagamento online confirmado).

CREATE OR REPLACE FUNCTION public.order_should_notify_staff_on_panel(p public.orders)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.status = 'cancelled'::public.order_status THEN false
      WHEN p.payment_status = 'paid'::public.payment_status THEN true
      WHEN p.order_type = 'dine_in'::public.order_type THEN true
      WHEN p.payment_method IN ('card', 'bizum', 'apple_pay', 'google_pay', 'pix') THEN false
      WHEN p.stripe_payment_intent_id IS NOT NULL THEN false
      ELSE true
    END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_staff_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending'::public.order_status
       AND public.order_should_notify_staff_on_panel(NEW) THEN
      PERFORM public.dispatch_staff_new_order_push(NEW.store_id, NEW.id, NEW.order_number);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status IS DISTINCT FROM 'paid'::public.payment_status
       AND NEW.payment_status = 'paid'::public.payment_status
       AND NEW.status = 'pending'::public.order_status
       AND public.order_should_notify_staff_on_panel(NEW) THEN
      PERFORM public.dispatch_staff_new_order_push(NEW.store_id, NEW.id, NEW.order_number);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_staff_push_after_insert ON public.orders;
CREATE TRIGGER orders_staff_push_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_staff_push();

DROP TRIGGER IF EXISTS orders_staff_push_after_update ON public.orders;
CREATE TRIGGER orders_staff_push_after_update
  AFTER UPDATE OF payment_status, status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_staff_push();
