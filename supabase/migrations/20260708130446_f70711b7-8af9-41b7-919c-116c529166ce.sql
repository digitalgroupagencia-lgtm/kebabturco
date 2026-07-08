CREATE UNIQUE INDEX IF NOT EXISTS staff_live_activity_tokens_customer_start_sent_unique
  ON public.staff_live_activity_tokens (store_id, order_id, token_kind)
  WHERE order_id IS NOT NULL AND token_kind = 'customer_start_sent';