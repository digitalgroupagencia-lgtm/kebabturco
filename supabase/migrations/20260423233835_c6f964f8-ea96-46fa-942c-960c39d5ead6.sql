-- Helper: gera próximo order_number da loja no formato sequencial diário
CREATE OR REPLACE FUNCTION public.next_order_number(_store_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*)+1 INTO v_count FROM public.orders 
  WHERE store_id = _store_id AND created_at::date = CURRENT_DATE;
  RETURN LPAD(v_count::text, 4, '0');
END;
$$;

-- Abre (ou retorna) sessão de mesa aberta
CREATE OR REPLACE FUNCTION public.open_or_get_table_session(_store_id uuid, _table_number text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.table_sessions
  WHERE store_id = _store_id AND table_number = _table_number AND status = 'open'
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.table_sessions (store_id, table_number, status, opened_by)
    VALUES (_store_id, _table_number, 'open', auth.uid())
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Adiciona (ou retorna) cliente da sessão pelo nome
CREATE OR REPLACE FUNCTION public.add_or_get_table_customer(_session_id uuid, _name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_store uuid;
BEGIN
  SELECT id INTO v_id FROM public.table_session_customers
  WHERE session_id = _session_id AND name = _name AND status = 'active'
  LIMIT 1;
  IF v_id IS NULL THEN
    SELECT store_id INTO v_store FROM public.table_sessions WHERE id = _session_id;
    INSERT INTO public.table_session_customers (session_id, store_id, name)
    VALUES (_session_id, v_store, _name)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Cria pedido completo do vendedor com itens; atualiza totais da mesa/cliente
CREATE OR REPLACE FUNCTION public.create_seller_order(
  _store_id uuid,
  _table_number text,
  _customer_name text,
  _items jsonb,
  _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session uuid;
  v_customer uuid;
  v_order uuid;
  v_order_number text;
  v_total numeric := 0;
  v_item jsonb;
  v_qty int;
  v_unit numeric;
  v_line numeric;
BEGIN
  IF NOT (public.is_seller(auth.uid()) OR public.has_role(auth.uid(), 'restaurant_admin'::app_role) OR public.has_role(auth.uid(), 'admin_master'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_session := public.open_or_get_table_session(_store_id, _table_number);
  v_customer := public.add_or_get_table_customer(v_session, _customer_name);
  v_order_number := public.next_order_number(_store_id);

  -- Soma total
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line := v_qty * v_unit;
    v_total := v_total + v_line;
  END LOOP;

  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, table_number, seller_id, table_session_id, table_customer_id,
    subtotal, total, notes
  ) VALUES (
    _store_id, v_order_number, 'waiter'::order_source, 'pending'::order_status, 'dine_in',
    _customer_name, _table_number, auth.uid(), v_session, v_customer,
    v_total, v_total, _notes
  ) RETURNING id INTO v_order;

  -- Insere itens
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line := v_qty * v_unit;
    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      size_name, extras, removed, notes
    ) VALUES (
      v_order,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_qty, v_unit, v_line,
      v_item->>'size_name',
      COALESCE(v_item->'extras', '[]'::jsonb),
      COALESCE(v_item->'removed', '[]'::jsonb),
      v_item->>'notes'
    );
  END LOOP;

  -- Atualiza totais
  UPDATE public.table_session_customers SET total_amount = total_amount + v_total, updated_at = now() WHERE id = v_customer;
  UPDATE public.table_sessions SET total_amount = total_amount + v_total, updated_at = now() WHERE id = v_session;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order,
    'order_number', v_order_number,
    'session_id', v_session,
    'customer_id', v_customer,
    'total', v_total
  );
END;
$$;

-- Detalhe de uma sessão de mesa: clientes + totais
CREATE OR REPLACE FUNCTION public.get_table_session_detail(_session_id uuid)
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  status text,
  total_amount numeric,
  payment_method text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, status, total_amount, payment_method
  FROM public.table_session_customers
  WHERE session_id = _session_id
  ORDER BY created_at;
$$;

-- Fecha um cliente específico
CREATE OR REPLACE FUNCTION public.close_table_customer(
  _customer_id uuid,
  _payment_method text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session uuid;
  v_amount numeric;
  v_remaining int;
BEGIN
  UPDATE public.table_session_customers
  SET status = 'closed', payment_method = _payment_method, closed_at = now(), closed_by = auth.uid(), updated_at = now()
  WHERE id = _customer_id AND status = 'active'
  RETURNING session_id, total_amount INTO v_session, v_amount;

  IF v_session IS NULL THEN RAISE EXCEPTION 'Cliente já fechado ou não encontrado'; END IF;

  -- Marca pedidos do cliente como entregues/pagos
  UPDATE public.orders
  SET status = 'delivered'::order_status, payment_method = (
    CASE _payment_method WHEN 'card' THEN 'card'::payment_method
                         WHEN 'cash' THEN 'cash'::payment_method
                         WHEN 'pix' THEN 'pix'::payment_method
                         WHEN 'apple_pay' THEN 'apple_pay'::payment_method
                         WHEN 'google_pay' THEN 'google_pay'::payment_method
                         ELSE NULL END),
      updated_at = now()
  WHERE table_customer_id = _customer_id AND status != 'cancelled';

  -- Se todos clientes fecharam, fecha a sessão
  SELECT COUNT(*) INTO v_remaining FROM public.table_session_customers
  WHERE session_id = v_session AND status = 'active';
  IF v_remaining = 0 THEN
    UPDATE public.table_sessions
    SET status = 'closed', closed_at = now(), closed_by = auth.uid(), updated_at = now()
    WHERE id = v_session;
  END IF;

  RETURN jsonb_build_object('success', true, 'amount', v_amount, 'session_closed', (v_remaining = 0));
END;
$$;

-- Fecha mesa inteira (unificada — uma só forma de pagamento para todos)
CREATE OR REPLACE FUNCTION public.close_table_session_unified(
  _session_id uuid,
  _payment_method text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  -- Fecha todos os clientes ativos
  UPDATE public.table_session_customers
  SET status = 'closed', payment_method = _payment_method, closed_at = now(), closed_by = auth.uid(), updated_at = now()
  WHERE session_id = _session_id AND status = 'active';

  -- Marca pedidos
  UPDATE public.orders
  SET status = 'delivered'::order_status, payment_method = (
    CASE _payment_method WHEN 'card' THEN 'card'::payment_method
                         WHEN 'cash' THEN 'cash'::payment_method
                         WHEN 'pix' THEN 'pix'::payment_method
                         WHEN 'apple_pay' THEN 'apple_pay'::payment_method
                         WHEN 'google_pay' THEN 'google_pay'::payment_method
                         ELSE NULL END),
      updated_at = now()
  WHERE table_session_id = _session_id AND status != 'cancelled';

  UPDATE public.table_sessions
  SET status = 'closed', payment_mode = 'unified', payment_method = _payment_method,
      closed_at = now(), closed_by = auth.uid(), updated_at = now()
  WHERE id = _session_id
  RETURNING total_amount INTO v_total;

  RETURN jsonb_build_object('success', true, 'total', v_total);
END;
$$;

-- Relatórios por vendedor
CREATE OR REPLACE FUNCTION public.get_seller_report(_store_id uuid, _since timestamptz)
RETURNS TABLE(
  seller_id uuid,
  seller_name text,
  order_count bigint,
  revenue numeric,
  avg_ticket numeric,
  cancelled bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    o.seller_id,
    COALESCE(p.full_name, 'Vendedor') AS seller_name,
    COUNT(*) FILTER (WHERE o.status != 'cancelled')::bigint AS order_count,
    COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0) AS revenue,
    COALESCE(AVG(o.total) FILTER (WHERE o.status != 'cancelled'), 0) AS avg_ticket,
    COUNT(*) FILTER (WHERE o.status = 'cancelled')::bigint AS cancelled
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.user_id = o.seller_id
  WHERE o.store_id = _store_id AND o.created_at >= _since AND o.seller_id IS NOT NULL
  GROUP BY o.seller_id, p.full_name
  ORDER BY revenue DESC;
$$;