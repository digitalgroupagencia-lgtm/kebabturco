-- Remove overloads duplicados que causam erro PGRST203 (ambiguidade) no PostgREST.
-- Mantém apenas a assinatura mais recente/completa de cada função.

DROP FUNCTION IF EXISTS public.mark_order_paid_at_counter(_order_id uuid, _payment_method text, _staff_pin text);
DROP FUNCTION IF EXISTS public.register_native_push_subscription(_store_id uuid, _fcm_token text, _platform text, _customer_phone text, _order_id uuid);
