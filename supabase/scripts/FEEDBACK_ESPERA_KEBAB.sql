-- Kebab Turco — Sugestões / reclamações enquanto o cliente espera o pedido
-- Projeto: kvpssbhclafoymhecmuk — correr no SQL Editor (idempotente).

CREATE TABLE IF NOT EXISTS public.customer_order_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number text,
  order_status_at_send text,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_order_feedback_message_len CHECK (char_length(trim(message)) >= 3 AND char_length(message) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_customer_order_feedback_store_created
  ON public.customer_order_feedback (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_order_feedback_unread
  ON public.customer_order_feedback (store_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.customer_order_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store team read customer feedback" ON public.customer_order_feedback;
CREATE POLICY "Store team read customer feedback"
  ON public.customer_order_feedback FOR SELECT TO authenticated
  USING (
    public.user_can_access_store(store_id)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  );

DROP POLICY IF EXISTS "Store team update customer feedback" ON public.customer_order_feedback;
CREATE POLICY "Store team update customer feedback"
  ON public.customer_order_feedback FOR UPDATE TO authenticated
  USING (
    public.user_can_access_store(store_id)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  )
  WITH CHECK (
    public.user_can_access_store(store_id)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  );

DROP POLICY IF EXISTS "No direct insert customer feedback" ON public.customer_order_feedback;
CREATE POLICY "No direct insert customer feedback"
  ON public.customer_order_feedback FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.submit_customer_order_feedback(
  _order_id uuid,
  _message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_msg text;
  v_id uuid;
BEGIN
  v_msg := trim(coalesce(_message, ''));
  IF char_length(v_msg) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'message_too_short');
  END IF;
  IF char_length(v_msg) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'message_too_long');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  INSERT INTO public.customer_order_feedback (
    order_id,
    store_id,
    order_number,
    order_status_at_send,
    message
  ) VALUES (
    v_order.id,
    v_order.store_id,
    COALESCE(v_order.order_number::text, v_order.id::text),
    v_order.status::text,
    v_msg
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'feedback_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_order_feedback(uuid, text) TO anon, authenticated;
