-- Cancelamento com PIN, notificações personalizadas e push à equipa quando pedido é cancelado.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelled_by_name text;

COMMENT ON COLUMN public.orders.cancelled_by_name IS 'Nome do funcionário que cancelou o pedido (via PIN).';

-- Admin geral também pode definir código de balcão (ex.: 4321).
CREATE OR REPLACE FUNCTION public.upsert_my_staff_access_pin(_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_role_id uuid;
  v_store_id uuid;
  v_hash text;
BEGIN
  IF _pin IS NULL OR trim(_pin) !~ '^\d{4,8}$' THEN
    RAISE EXCEPTION 'Código deve ter entre 4 e 8 dígitos';
  END IF;

  IF public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    SELECT ur.id, ur.store_id
    INTO v_user_role_id, v_store_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin_master'::public.app_role
    ORDER BY ur.created_at
    LIMIT 1;

    IF v_user_role_id IS NULL THEN
      SELECT ur.id, ur.store_id
      INTO v_user_role_id, v_store_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id IS NOT NULL
      ORDER BY ur.created_at
      LIMIT 1;
    END IF;
  ELSE
    SELECT ur.id, ur.store_id
    INTO v_user_role_id, v_store_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.store_id IS NOT NULL
      AND ur.role IN (
        'seller'::public.app_role,
        'restaurant_admin'::public.app_role,
        'manager'::public.app_role,
        'operator'::public.app_role,
        'kitchen'::public.app_role,
        'cashier'::public.app_role,
        'attendant'::public.app_role
      )
    ORDER BY
      CASE ur.role
        WHEN 'seller' THEN 1
        WHEN 'restaurant_admin' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'operator' THEN 4
        WHEN 'kitchen' THEN 5
        WHEN 'cashier' THEN 6
        WHEN 'attendant' THEN 7
        ELSE 99
      END,
      ur.created_at
    LIMIT 1;
  END IF;

  IF v_user_role_id IS NULL OR v_store_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de equipa não encontrado nesta loja';
  END IF;

  IF public.staff_pin_in_use(v_store_id, trim(_pin), v_user_role_id) THEN
    RAISE EXCEPTION 'Este código já está em uso nesta loja';
  END IF;

  BEGIN
    v_hash := extensions.crypt(trim(_pin), extensions.gen_salt('bf'));
  EXCEPTION
    WHEN undefined_function OR invalid_schema_name THEN
      v_hash := crypt(trim(_pin), gen_salt('bf'));
  END;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, auth.uid(), v_user_role_id, v_hash)
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_staff_pin_for_order(
  _store_id uuid,
  _staff_pin text
)
RETURNS TABLE(user_id uuid, staff_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
BEGIN
  IF _staff_pin IS NULL OR trim(_staff_pin) = '' THEN
    RETURN;
  END IF;

  SELECT v.user_id INTO v_user_id
  FROM public.verify_staff_access_pin(_store_id, trim(_staff_pin)) v
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT v.user_id INTO v_user_id
    FROM public.verify_staff_access_pin_any(trim(_staff_pin)) v
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(u.email, '@', 1))
  INTO v_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = v_user_id;

  RETURN QUERY SELECT v_user_id, v_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_staff_pin_for_order(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_order_with_staff_pin(
  _order_id uuid,
  _staff_pin text,
  _reason text DEFAULT 'Pedido cancelado pelo restaurante'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_staff_user_id uuid;
  v_staff_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF _staff_pin IS NULL OR trim(_staff_pin) = '' THEN
    RAISE EXCEPTION 'Introduza o código pessoal para cancelar';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR v_order.store_id IN (
      SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_order.status = 'cancelled'::public.order_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number
    );
  END IF;

  SELECT r.user_id, r.staff_name
  INTO v_staff_user_id, v_staff_name
  FROM public.resolve_staff_pin_for_order(v_order.store_id, trim(_staff_pin)) r
  LIMIT 1;

  IF v_staff_user_id IS NULL THEN
    RAISE EXCEPTION 'Código incorreto ou inativo';
  END IF;

  UPDATE public.orders
  SET
    status = 'cancelled'::public.order_status,
    notes = COALESCE(NULLIF(trim(_reason), ''), 'Pedido cancelado pelo restaurante'),
    cancelled_by_user_id = v_staff_user_id,
    cancelled_by_name = v_staff_name,
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'order_number', v_order.order_number,
    'cancelled_by_name', v_staff_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order_with_staff_pin(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_staff_order_cancelled_push(
  _store_id uuid,
  _order_id uuid,
  _order_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.platform_push_config%ROWTYPE;
  v_headers jsonb;
BEGIN
  IF _store_id IS NULL OR _order_id IS NULL OR NULLIF(trim(_order_number), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF NULLIF(trim(v_cfg.staff_push_secret), '') IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-staff-push-secret', trim(v_cfg.staff_push_secret));
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/send-push-notification',
    headers := v_headers,
    body := jsonb_build_object(
      'storeId', _store_id,
      'staffOrderCancelledId', _order_id,
      'tag', 'staff-order-cancelled-' || _order_id::text,
      'url', '/panel/live?order=' || _order_id::text,
      'requireInteraction', true
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_staff_order_cancelled_push failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_customer_order_status_push(
  _order_id uuid,
  _event text,
  _order_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.platform_push_config%ROWTYPE;
BEGIN
  IF _order_id IS NULL OR NULLIF(trim(_event), '') IS NULL THEN
    RETURN;
  END IF;

  IF _event NOT IN (
    'payment_paid', 'preparing', 'ready', 'out_for_delivery',
    'delivered', 'collected', 'served', 'cancelled', 'pending'
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'orderId', _order_id,
      'customerOrderEvent', _event,
      'tag', 'order-' || _order_id::text,
      'url', '/?screen=tracking&order=' || _order_id::text
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_customer_order_status_push failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_staff_cancel_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'cancelled'::public.order_status THEN
    PERFORM public.dispatch_staff_order_cancelled_push(NEW.store_id, NEW.id, NEW.order_number);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_staff_cancel_push_after_update ON public.orders;
CREATE TRIGGER orders_staff_cancel_push_after_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_staff_cancel_push();
