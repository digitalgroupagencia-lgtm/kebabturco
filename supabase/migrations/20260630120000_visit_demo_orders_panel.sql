-- Demo visita: marcar pedidos com cupão DEMO-IMPRESSAO como teste ao inserir (não aparecem no painel).

CREATE OR REPLACE FUNCTION public.orders_mark_demo_visit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF upper(trim(COALESCE(NEW.coupon_code, ''))) = 'DEMO-IMPRESSAO' THEN
    NEW.is_test := true;
    IF COALESCE(NEW.notes, '') NOT ILIKE '%DEMO VISITA%' THEN
      NEW.notes := trim(COALESCE(NEW.notes, '') || ' [DEMO VISITA — só admin master]');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_mark_demo_visit ON public.orders;
CREATE TRIGGER trg_orders_mark_demo_visit
  BEFORE INSERT OR UPDATE OF coupon_code, is_test, notes ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_mark_demo_visit();
