-- Fase 3 — Push subscriptions (registo público via RPC, leitura restrita)

DROP POLICY IF EXISTS "Anon insert push subs" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Read own push subs" ON public.push_subscriptions;

CREATE POLICY "Tenant read push subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR (store_id IS NOT NULL AND public.user_can_access_store(store_id))
  );

CREATE POLICY "Admin master manage push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

CREATE OR REPLACE FUNCTION public.register_push_subscription(
  _store_id uuid,
  _order_id uuid DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _endpoint text DEFAULT NULL,
  _p256dh text DEFAULT NULL,
  _auth text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _store_id IS NULL OR _endpoint IS NULL OR _p256dh IS NULL OR _auth IS NULL THEN
    RAISE EXCEPTION 'Dados de subscrição incompletos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  INSERT INTO public.push_subscriptions (
    store_id, order_id, customer_phone, endpoint, p256dh, auth
  ) VALUES (
    _store_id,
    _order_id,
    NULLIF(trim(_customer_phone), ''),
    _endpoint,
    _p256dh,
    _auth
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    order_id = EXCLUDED.order_id,
    customer_phone = EXCLUDED.customer_phone,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_subscription(uuid, uuid, text, text, text, text) TO anon, authenticated;
