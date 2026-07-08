-- Live Activity: tokens push-to-start da equipa + aceitação remota
-- Correr no SQL Editor Supabase (projeto kvpssbhclafoymhecmuk)

CREATE TABLE IF NOT EXISTS public.staff_live_activity_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_kind text NOT NULL DEFAULT 'push_to_start',
  token_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id, token_kind)
);

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_store_idx
  ON public.staff_live_activity_tokens (store_id, updated_at DESC);

ALTER TABLE public.staff_live_activity_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_live_activity_tokens_self ON public.staff_live_activity_tokens;
CREATE POLICY staff_live_activity_tokens_self ON public.staff_live_activity_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.user_can_access_store(store_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_live_activity_tokens TO authenticated;
GRANT ALL ON public.staff_live_activity_tokens TO service_role;
