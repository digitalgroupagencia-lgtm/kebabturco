CREATE UNIQUE INDEX IF NOT EXISTS staff_live_activity_tokens_staff_start_unique
  ON public.staff_live_activity_tokens (store_id, order_id, token_kind)
  WHERE order_id IS NOT NULL AND token_kind = 'staff_start_sent';