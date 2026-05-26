ALTER TABLE public.operations_settings
  ALTER COLUMN pay_cash_takeaway SET DEFAULT true,
  ALTER COLUMN require_prepayment_takeaway SET DEFAULT false,
  ALTER COLUMN pay_cash_delivery SET DEFAULT false;

UPDATE public.operations_settings
SET
  pay_cash_takeaway = true,
  require_prepayment_takeaway = false,
  pay_cash_delivery = false;

CREATE OR REPLACE FUNCTION public.enforce_order_payment_business_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_type = 'delivery' AND NEW.payment_method = 'cash' THEN
    RAISE EXCEPTION 'Delivery não aceita pagamento em dinheiro';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_payment_business_rules_trigger ON public.orders;

CREATE TRIGGER enforce_order_payment_business_rules_trigger
BEFORE INSERT OR UPDATE OF order_type, payment_method ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_payment_business_rules();