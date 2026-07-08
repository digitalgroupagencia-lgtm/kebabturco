ALTER TABLE public.staff_live_activity_tokens
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_active_order_idx
  ON public.staff_live_activity_tokens (store_id, order_id, token_kind, updated_at DESC)
  WHERE order_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_active_activity_idx
  ON public.staff_live_activity_tokens (activity_id, token_kind)
  WHERE activity_id IS NOT NULL AND is_active = true;