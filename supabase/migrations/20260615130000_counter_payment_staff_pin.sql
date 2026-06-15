-- Confirmação de pagamento no balcão exige código pessoal da equipa (tablet partilhado).

DROP FUNCTION IF EXISTS public.mark_order_paid_at_counter(uuid, text);

CREATE OR REPLACE FUNCTION public.mark_order_paid_at_counter(
  _order_id uuid,
  _payment_method text DEFAULT 'cash',
  _staff_pin text DEFAULT NULL
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF _staff_pin IS NULL OR trim(_staff_pin) = '' THEN
    RAISE EXCEPTION 'Introduza o código pessoal de quem recebeu o pagamento';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR v_order.store_id IN (
      SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
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

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(u.email, '@', 1))
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = v_pin_user_id;

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method
    ELSE 'cash'::public.payment_method
  END;

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, v_pm),
    payment_confirmed_by_user_id = v_pin_user_id,
    payment_confirmed_by_name = v_name,
    payment_confirmed_at = now(),
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

GRANT EXECUTE ON FUNCTION public.mark_order_paid_at_counter(uuid, text, text) TO authenticated;

-- Aceitar PIN simples (4–8 dígitos) ou formato com # (6–10 caracteres).
CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
BEGIN
  IF _pin IS NULL
     OR NOT (
       _pin ~ '^\d{4,8}$'
       OR (
         length(_pin) BETWEEN 6 AND 10
         AND position('#' in _pin) > 0
         AND _pin ~ '[0-9]'
       )
     ) THEN
    RAISE EXCEPTION 'Código: 4–8 dígitos ou 6–10 caracteres com # e números';
  END IF;

  SELECT ur.store_id, ur.user_id INTO v_store_id, v_user_id
  FROM public.user_roles ur
  WHERE ur.id = _user_role_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Membro da equipe nao encontrado';
  END IF;

  IF NOT public.user_manages_store_team(v_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissao para definir codigo de acesso';
  END IF;

  IF public.staff_pin_in_use(v_store_id, _pin, _user_role_id) THEN
    RAISE EXCEPTION 'Este codigo ja esta em uso nesta loja';
  END IF;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, v_user_id, _user_role_id, extensions.crypt(_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$fn$;
