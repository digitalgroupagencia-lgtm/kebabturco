CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ur.tenant_id
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.tenant_id IS NOT NULL
        AND ur.role::text IN (
          'admin_master', 'restaurant_admin', 'manager', 'operator',
          'cashier', 'attendant', 'kitchen', 'seller', 'delivery'
        )
      ORDER BY
        CASE ur.role::text
          WHEN 'admin_master' THEN 0
          WHEN 'restaurant_admin' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'operator' THEN 3
          WHEN 'cashier' THEN 4
          WHEN 'attendant' THEN 5
          WHEN 'kitchen' THEN 6
          WHEN 'seller' THEN 7
          WHEN 'delivery' THEN 8
          ELSE 9
        END,
        ur.created_at ASC
      LIMIT 1
    ),
    (
      SELECT s.tenant_id
      FROM public.user_roles ur
      INNER JOIN public.stores s ON s.id = ur.store_id
      WHERE ur.user_id = _user_id
        AND ur.store_id IS NOT NULL
      ORDER BY ur.created_at ASC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_staff_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_roles%ROWTYPE;
  v_store_id uuid;
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT * INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY
    CASE ur.role::text
      WHEN 'admin_master' THEN 0
      WHEN 'restaurant_admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'operator' THEN 3
      WHEN 'cashier' THEN 4
      WHEN 'attendant' THEN 5
      WHEN 'kitchen' THEN 6
      WHEN 'seller' THEN 7
      WHEN 'delivery' THEN 8
      ELSE 9
    END,
    ur.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  v_store_id := v_role.store_id;
  v_tenant_id := v_role.tenant_id;

  IF v_store_id IS NOT NULL AND v_tenant_id IS NULL THEN
    SELECT s.tenant_id INTO v_tenant_id FROM public.stores s WHERE s.id = v_store_id;
  END IF;

  IF v_store_id IS NULL AND v_tenant_id IS NOT NULL THEN
    SELECT s.id INTO v_store_id
    FROM public.stores s
    WHERE s.tenant_id = v_tenant_id
    ORDER BY s.sort_order NULLS LAST, s.created_at ASC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'role', v_role.role::text,
    'tenant_id', v_tenant_id,
    'store_id', v_store_id
  );
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_my_staff_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_v2(uuid, jsonb) TO authenticated;