DROP INDEX IF EXISTS public.staff_live_activity_tokens_customer_unique;

CREATE UNIQUE INDEX IF NOT EXISTS staff_live_activity_tokens_customer_start_unique
ON public.staff_live_activity_tokens (store_id, order_id, token_kind)
WHERE order_id IS NOT NULL AND token_kind = 'customer_push_to_start';

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_staff_activity_update_order_idx
ON public.staff_live_activity_tokens (store_id, order_id, updated_at DESC)
WHERE order_id IS NOT NULL AND token_kind = 'activity_update';