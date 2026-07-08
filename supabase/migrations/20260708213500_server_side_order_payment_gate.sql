-- Regra de segurança no servidor:
-- pedidos takeaway/delivery não podem avançar para cozinha sem pagamento confirmado.

CREATE OR REPLACE FUNCTION public.order_blocks_progress_until_paid(_o public.orders)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    _o.payment_status IS DISTINCT FROM 'paid'::public.payment_status
    AND _o.order_type IN ('takeaway', 'delivery');
$$;

CREATE OR REPLACE FUNCTION public.enforce_order_payment_business_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('preparing'::public.order_status, 'ready'::public.order_status)
     AND NEW.status IS DISTINCT FROM OLD.status
     AND public.order_blocks_progress_until_paid(NEW) THEN
    RAISE EXCEPTION 'Pagamento pendente: este pedido não pode avançar para cozinha';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_payment_business_rules ON public.orders;
CREATE TRIGGER trg_enforce_order_payment_business_rules
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_payment_business_rules();

CREATE OR REPLACE FUNCTION public.update_order_status_v2(_order_id uuid, _patch jsonb)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT public.user_can_access_store(v_order.store_id) THEN
    RAISE EXCEPTION 'Sem permissão para actualizar este pedido';
  END IF;

  v_status := COALESCE(_patch->>'status', v_order.status::text);

  IF v_status::public.order_status IN ('preparing'::public.order_status, 'ready'::public.order_status)
     AND public.order_blocks_progress_until_paid(v_order) THEN
    RAISE EXCEPTION 'Pagamento pendente: este pedido não pode avançar para cozinha';
  END IF;

  UPDATE public.orders
  SET
    status = v_status::public.order_status,
    estimated_ready_at = CASE
      WHEN _patch ? 'estimated_ready_at' THEN NULLIF(_patch->>'estimated_ready_at', '')::timestamptz
      ELSE estimated_ready_at
    END,
    delivery_confirmation_code = CASE
      WHEN _patch ? 'delivery_confirmation_code' THEN NULLIF(_patch->>'delivery_confirmation_code', '')
      ELSE delivery_confirmation_code
    END,
    accepted_by_user_id = CASE
      WHEN _patch ? 'accepted_by_user_id' THEN NULLIF(_patch->>'accepted_by_user_id', '')::uuid
      ELSE accepted_by_user_id
    END,
    accepted_by_name = CASE
      WHEN _patch ? 'accepted_by_name' THEN NULLIF(_patch->>'accepted_by_name', '')
      ELSE accepted_by_name
    END,
    accepted_at = CASE
      WHEN _patch ? 'accepted_at' THEN NULLIF(_patch->>'accepted_at', '')::timestamptz
      ELSE accepted_at
    END,
    updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_advance_order_status(
  _order_id uuid,
  _new_status public.order_status,
  _estimated_ready_at timestamptz DEFAULT NULL,
  _delivery_confirmation_code text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_uid uuid := auth.uid();
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Login necessário';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin_master'::public.app_role)
    OR public.user_can_access_store(v_order.store_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para este pedido';
  END IF;

  IF _new_status IN ('preparing'::public.order_status, 'ready'::public.order_status)
     AND public.order_blocks_progress_until_paid(v_order) THEN
    RAISE EXCEPTION 'Pagamento pendente: este pedido não pode avançar para cozinha';
  END IF;

  IF v_order.status = 'pending'::public.order_status
     AND _new_status = 'preparing'::public.order_status THEN
    SELECT COALESCE(NULLIF(trim(p.full_name), ''), u.email::text, 'Operador')
    INTO v_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = v_uid;

    UPDATE public.orders SET
      status = _new_status,
      estimated_ready_at = COALESCE(_estimated_ready_at, estimated_ready_at),
      accepted_by_user_id = v_uid,
      accepted_at = now(),
      accepted_by_name = v_name,
      updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO v_order;
  ELSE
    UPDATE public.orders SET
      status = _new_status,
      estimated_ready_at = COALESCE(_estimated_ready_at, estimated_ready_at),
      delivery_confirmation_code = COALESCE(_delivery_confirmation_code, delivery_confirmation_code),
      updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO v_order;
  END IF;

  RETURN v_order;
END;
$$;

