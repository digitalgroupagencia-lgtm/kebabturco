-- Hardening do pagamento manual no balcão:
-- - Apenas admin_master / restaurant_admin / manager / cashier podem confirmar.
-- - Rejeita pedido cancelado.
-- - Regista auditoria obrigatória de pagamento manual.

CREATE TABLE IF NOT EXISTS public.manual_payment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('cash', 'card_manual')),
  amount numeric NOT NULL DEFAULT 0,
  ip_address inet NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_payment_audit_order_id
  ON public.manual_payment_audit(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_payment_audit_staff_user_id
  ON public.manual_payment_audit(staff_user_id, created_at DESC);

ALTER TABLE public.manual_payment_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store team view manual payment audit" ON public.manual_payment_audit;
CREATE POLICY "Store team view manual payment audit"
  ON public.manual_payment_audit
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = manual_payment_audit.store_id
        AND ur.role IN (
          'restaurant_admin'::public.app_role,
          'manager'::public.app_role,
          'cashier'::public.app_role
        )
    )
  );

GRANT SELECT, INSERT ON public.manual_payment_audit TO service_role;

CREATE OR REPLACE FUNCTION public.mark_order_paid_at_counter(
  _order_id uuid,
  _payment_method text DEFAULT 'cash',
  _staff_pin text DEFAULT NULL,
  _stripe_payment_intent_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_pm public.payment_method;
  v_name text;
  v_pin_user_id uuid;
  v_audit_method text;
  v_amount numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  PERFORM public.assert_rate_limit(
    'uid:' || auth.uid()::text || ':order:' || _order_id::text,
    'mark_order_paid_at_counter',
    5,
    60
  );

  IF _staff_pin IS NULL OR trim(_staff_pin) = '' THEN
    RAISE EXCEPTION 'Introduza o código pessoal de quem recebeu o pagamento';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'Pedido cancelado não pode ser marcado como pago';
  END IF;

  -- Apenas papéis autorizados podem iniciar a confirmação manual.
  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = v_order.store_id
        AND ur.role IN (
          'restaurant_admin'::public.app_role,
          'manager'::public.app_role,
          'cashier'::public.app_role
        )
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'payment_confirmed_by_name', v_order.payment_confirmed_by_name
    );
  END IF;

  SELECT v.user_id INTO v_pin_user_id
  FROM public.verify_staff_access_pin(v_order.store_id, trim(_staff_pin)) v
  LIMIT 1;

  IF v_pin_user_id IS NULL THEN
    RAISE EXCEPTION 'Código incorreto ou inativo';
  END IF;

  -- O funcionário do PIN também deve ser autorizado para confirmação de pagamento.
  IF NOT (
    public.has_role(v_pin_user_id, 'admin_master'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = v_pin_user_id
        AND ur.store_id = v_order.store_id
        AND ur.role IN (
          'restaurant_admin'::public.app_role,
          'manager'::public.app_role,
          'cashier'::public.app_role
        )
    )
  ) THEN
    RAISE EXCEPTION 'Funcionário sem permissão para confirmar pagamento';
  END IF;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(u.email, '@', 1))
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = v_pin_user_id;

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    ELSE 'cash'::public.payment_method
  END;

  v_audit_method := CASE
    WHEN _payment_method = 'card' THEN 'card_manual'
    ELSE 'cash'
  END;

  v_amount := ROUND(COALESCE(v_order.total, 0), 2);

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, v_pm),
    stripe_payment_intent_id = COALESCE(NULLIF(trim(_stripe_payment_intent_id), ''), stripe_payment_intent_id),
    payment_confirmed_by_user_id = v_pin_user_id,
    payment_confirmed_by_name = v_name,
    payment_confirmed_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  INSERT INTO public.manual_payment_audit (
    order_id,
    store_id,
    staff_user_id,
    method,
    amount,
    ip_address,
    user_agent
  ) VALUES (
    v_order.id,
    v_order.store_id,
    v_pin_user_id,
    v_audit_method,
    v_amount,
    NULL,
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'order_number', v_order.order_number,
    'payment_confirmed_by_name', v_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid_at_counter(uuid, text, text, text) TO authenticated;

