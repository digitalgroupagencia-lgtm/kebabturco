-- Payment online authority hardening:
-- Clients (anon/authenticated) must NOT be able to mark orders as paid.
-- Keep access for `service_role` (used by Supabase edge functions / webhooks).

-- confirm_order_payment(text, text) (mesa mode)
REVOKE EXECUTE ON FUNCTION public.confirm_order_payment(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(text, text) TO service_role;

-- record_payment_settlement overloads:
-- (text, integer, integer, integer, integer, integer)  [legacy]
REVOKE EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer) TO service_role;

-- (text, integer, integer, integer, integer, integer, text)  [current: includes _payment_method]
REVOKE EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer, text) TO service_role;

