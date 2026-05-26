REVOKE ALL ON FUNCTION public.enforce_order_payment_business_rules() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_order_payment_business_rules() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_order_payment_business_rules() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_order_payment_business_rules() TO service_role;