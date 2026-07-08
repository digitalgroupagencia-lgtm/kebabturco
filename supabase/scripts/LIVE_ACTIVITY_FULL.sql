-- Cartões no ecrã (Live Activity) — configuração + tokens
-- Correr no SQL Editor Supabase (projeto kvpssbhclafoymhecmuk)
-- Seguro correr mais do que uma vez (actualiza tabela antiga se já existir).

-- 1) Personalização pelo painel (por loja)
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS la_staff_card_title text NOT NULL DEFAULT 'Novo pedido',
  ADD COLUMN IF NOT EXISTS la_customer_card_title text NOT NULL DEFAULT 'O seu pedido',
  ADD COLUMN IF NOT EXISTS la_staff_new_message text NOT NULL DEFAULT 'Aguarda aceitação da equipa',
  ADD COLUMN IF NOT EXISTS la_staff_urgent_message text NOT NULL DEFAULT 'Urgente — aceite já',
  ADD COLUMN IF NOT EXISTS la_customer_ready_message text NOT NULL DEFAULT 'Pode levantar no balcão',
  ADD COLUMN IF NOT EXISTS la_color_normal text NOT NULL DEFAULT '#3A0205',
  ADD COLUMN IF NOT EXISTS la_color_urgent text NOT NULL DEFAULT '#5A080C',
  ADD COLUMN IF NOT EXISTS la_urgent_after_minutes integer NOT NULL DEFAULT 5;

-- 2) Tabela base (primeira instalação)
CREATE TABLE IF NOT EXISTS public.staff_live_activity_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_kind text NOT NULL DEFAULT 'push_to_start',
  token_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2b) Actualizar esquema antigo (LIVE_ACTIVITY_TOKENS.sql) → versão completa
ALTER TABLE public.staff_live_activity_tokens
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS activity_id text;

ALTER TABLE public.staff_live_activity_tokens
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.staff_live_activity_tokens
  DROP CONSTRAINT IF EXISTS staff_live_activity_tokens_store_id_user_id_token_kind_key;

DROP INDEX IF EXISTS staff_live_activity_tokens_store_id_user_id_token_kind_key;

CREATE UNIQUE INDEX IF NOT EXISTS staff_live_activity_tokens_staff_unique
  ON public.staff_live_activity_tokens (store_id, user_id, token_kind)
  WHERE user_id IS NOT NULL AND order_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_live_activity_tokens_customer_unique
  ON public.staff_live_activity_tokens (store_id, order_id, token_kind)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_live_activity_tokens_activity_update_unique
  ON public.staff_live_activity_tokens (activity_id, token_kind)
  WHERE activity_id IS NOT NULL AND token_kind = 'activity_update';

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_store_idx
  ON public.staff_live_activity_tokens (store_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS staff_live_activity_tokens_order_idx
  ON public.staff_live_activity_tokens (order_id, updated_at DESC)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.staff_live_activity_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_live_activity_tokens_self ON public.staff_live_activity_tokens;
CREATE POLICY staff_live_activity_tokens_self ON public.staff_live_activity_tokens
  FOR ALL TO authenticated
  USING (
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR (order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_phone IS NOT NULL
        AND o.customer_phone = COALESCE(
          NULLIF(trim(auth.jwt() ->> 'phone'), ''),
          NULLIF(trim(auth.jwt() -> 'user_metadata' ->> 'phone'), ''),
          NULLIF(trim(auth.jwt() -> 'user_metadata' ->> 'customer_phone'), ''),
          ''
        )
    ))
  )
  WITH CHECK (
    (user_id IS NOT NULL AND auth.uid() = user_id AND public.user_can_access_store(store_id))
    OR order_id IS NOT NULL
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_live_activity_tokens TO authenticated;
GRANT ALL ON public.staff_live_activity_tokens TO service_role;

-- Contagem para o painel admin (equipa com acesso à loja)
CREATE OR REPLACE FUNCTION public.count_staff_la_push_to_start_tokens(_store_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_access_store(_store_id) THEN
    RETURN -1;
  END IF;
  RETURN (
    SELECT count(*)::int
    FROM public.staff_live_activity_tokens
    WHERE store_id = _store_id AND token_kind = 'push_to_start'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_staff_la_push_to_start_tokens(uuid) TO authenticated;
