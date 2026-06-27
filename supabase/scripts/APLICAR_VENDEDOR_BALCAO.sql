-- Pedidos de balcão pelo vendedor (corre no SQL Editor do Supabase).

CREATE OR REPLACE FUNCTION public.create_seller_counter_order(
  _store_id uuid,
  _customer_name text,
  _items jsonb,
  _notes text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _customer_email text DEFAULT NULL,
  _order_type text DEFAULT 'takeaway'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order uuid;
  v_order_number text;
  v_total numeric := 0;
  v_item jsonb;
  v_qty int;
  v_unit numeric;
  v_line numeric;
  v_type public.order_type;
BEGIN
  IF NOT (
    public.is_seller(auth.uid())
    OR public.has_role(auth.uid(), 'restaurant_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_type := CASE lower(coalesce(_order_type, 'takeaway'))
    WHEN 'dine_in' THEN 'dine_in'::public.order_type
    ELSE 'takeaway'::public.order_type
  END;

  v_order_number := public.next_order_number(_store_id);

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line := v_qty * v_unit;
    v_total := v_total + v_line;
  END LOOP;

  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, customer_phone, customer_email,
    seller_id, notes, subtotal, total, payment_status
  ) VALUES (
    _store_id, v_order_number, 'counter'::public.order_source, 'pending'::public.order_status, v_type,
    _customer_name, NULLIF(trim(_customer_phone), ''), NULLIF(trim(_customer_email), ''),
    auth.uid(), _notes, v_total, v_total, 'pending'::public.payment_status
  ) RETURNING id INTO v_order;

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

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order,
    'order_number', v_order_number,
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_seller_counter_order(uuid, text, jsonb, text, text, text, text) TO authenticated;

SELECT 'Vendedor balcão: função create_seller_counter_order pronta' AS status;
