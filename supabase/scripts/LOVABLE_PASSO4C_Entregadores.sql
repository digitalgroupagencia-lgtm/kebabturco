-- PASSO 4C — Query NOVA (parte 3 de 3)
-- Entregadores

CREATE OR REPLACE FUNCTION public.list_store_drivers(_store_id uuid)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF NOT public.user_can_access_store(auth.uid(), _store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, COALESCE(p.full_name, 'Entregador') AS full_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.store_id = _store_id
    AND ur.role = 'delivery'::public.app_role
  ORDER BY p.full_name NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_store_drivers(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_delivery_driver(_order_id uuid, _driver_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.user_can_access_store(auth.uid(), v_order.store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF COALESCE(v_order.order_type, '') <> 'delivery' AND v_order.delivery_street IS NULL THEN
    RAISE EXCEPTION 'Pedido não é delivery';
  END IF;
  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para entrega';
  END IF;
  IF NOT public.user_is_delivery_driver(_driver_user_id, v_order.store_id) THEN
    RAISE EXCEPTION 'Utilizador não é entregador desta loja';
  END IF;
  UPDATE public.orders SET assigned_driver_id = _driver_user_id, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'assigned_driver_id', _driver_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_delivery_driver(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_delivery(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF v_order.assigned_driver_id IS DISTINCT FROM auth.uid()
     AND NOT public.user_can_access_store(auth.uid(), v_order.store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para sair';
  END IF;
  v_code := v_order.delivery_confirmation_code;
  IF v_code IS NULL OR trim(v_code) = '' THEN
    v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
  END IF;
  UPDATE public.orders SET
    status = 'out_for_delivery'::public.order_status,
    delivery_started_at = now(),
    delivery_confirmation_code = v_code,
    assigned_driver_id = COALESCE(assigned_driver_id, auth.uid()),
    updated_at = now()
  WHERE id = _order_id;
  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'delivery_confirmation_code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_driver_deliveries(_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, order_number text, status text, total numeric,
  customer_name text, customer_phone text,
  delivery_street text, delivery_number text, delivery_city text,
  delivery_notes text, notes text, delivery_confirmation_code text,
  delivery_started_at timestamptz, estimated_ready_at timestamptz,
  created_at timestamptz, assigned_driver_id uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  SELECT COALESCE(
    _store_id,
    (SELECT ur.store_id FROM public.user_roles ur
     WHERE ur.user_id = auth.uid() AND ur.role = 'delivery'::public.app_role LIMIT 1)
  ) INTO v_store_id;
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'Loja não encontrada'; END IF;
  IF NOT public.user_is_delivery_driver(auth.uid(), v_store_id)
     AND NOT public.user_can_access_store(auth.uid(), v_store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  RETURN QUERY
  SELECT o.id, o.order_number, o.status::text, o.total,
    o.customer_name, o.customer_phone, o.delivery_street, o.delivery_number, o.delivery_city,
    o.delivery_notes, o.notes, o.delivery_confirmation_code,
    o.delivery_started_at, o.estimated_ready_at, o.created_at, o.assigned_driver_id
  FROM public.orders o
  WHERE o.store_id = v_store_id
    AND (o.order_type = 'delivery' OR o.delivery_street IS NOT NULL)
    AND o.status::text IN ('ready', 'out_for_delivery')
    AND o.assigned_driver_id = auth.uid()
    AND o.created_at >= date_trunc('day', now())
  ORDER BY CASE o.status::text WHEN 'out_for_delivery' THEN 0 ELSE 1 END, o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_deliveries(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_delivery_with_code(_order_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(auth.uid(), v_order.store_id)
    OR v_order.assigned_driver_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para entrega';
  END IF;
  IF v_order.delivery_confirmation_code IS NULL OR trim(v_order.delivery_confirmation_code) = '' THEN
    RAISE EXCEPTION 'Código de entrega não configurado';
  END IF;
  IF trim(_code) <> trim(v_order.delivery_confirmation_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código incorrecto');
  END IF;
  UPDATE public.orders SET status = 'delivered'::public.order_status, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'order_number', v_order.order_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_code(uuid, text) TO authenticated;

SELECT 'Passo 4C OK' AS status;
