-- Demo visita: pedidos com cupão DEMO-IMPRESSAO nunca aparecem no painel da loja.
-- Correr no SQL Editor do Supabase (pode correr depois do FIX_VISIT_DEMO_BROWSER_RELAY.sql).

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

-- Marcar pedidos demo antigos que ainda aparecem no painel
UPDATE public.orders
SET
  is_test = true,
  notes = trim(COALESCE(notes, '') || ' [DEMO VISITA — só admin master]')
WHERE upper(trim(COALESCE(coupon_code, ''))) = 'DEMO-IMPRESSAO'
  AND COALESCE(is_test, false) = false;
