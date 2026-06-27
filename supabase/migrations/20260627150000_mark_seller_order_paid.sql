-- Vendedor autenticado marca o próprio pedido como pago com cartão (após Tap to Pay visual/real).

CREATE OR REPLACE FUNCTION public.mark_seller_order_paid(
  _order_id uuid,
  _payment_method text DEFAULT 'card',
  _stripe_payment_intent_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_pm public.payment_method;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.seller_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Só pode cobrar os seus próprios pedidos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.store_id = v_order.store_id
      AND ur.role = 'seller'::public.app_role
  ) THEN
    RAISE EXCEPTION 'Sem permissão de vendedor';
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'payment_confirmed_by_name', v_order.payment_confirmed_by_name
    );
  END IF;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(u.email, '@', 1))
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = auth.uid();

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    ELSE 'card'::public.payment_method
  END;

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, v_pm),
    payment_confirmed_by_user_id = auth.uid(),
    payment_confirmed_by_name = v_name,
    payment_confirmed_at = now(),
    stripe_payment_intent_id = COALESCE(_stripe_payment_intent_id, stripe_payment_intent_id),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'order_number', v_order.order_number,
    'payment_confirmed_by_name', v_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_seller_order_paid(uuid, text, text) TO authenticated;
