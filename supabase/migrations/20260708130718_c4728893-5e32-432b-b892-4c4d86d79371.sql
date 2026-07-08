DROP INDEX IF EXISTS public.staff_live_activity_tokens_activity_update_unique;

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_update_token_idx
  ON public.staff_live_activity_tokens (store_id, order_id, token_kind, token_value)
  WHERE order_id IS NOT NULL AND token_kind IN ('activity_update', 'customer_activity_update');