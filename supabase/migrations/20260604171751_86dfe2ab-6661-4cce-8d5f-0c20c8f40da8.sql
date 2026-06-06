CREATE OR REPLACE FUNCTION public.get_customer_orders(
  _store_id uuid,
  _phone text
) RETURNS TABLE (
  id uuid,
  order_number text,
  status text,
  total numeric,
  order_type text,
  created_at timestamptz,
  items jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    o.id, o.order_number, o.status::text, o.total, o.order_type, o.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price,
        'size_name', oi.size_name,
        'extras', oi.extras,
        'removed', oi.removed,
        'notes', oi.notes,
        'selections', oi.selections,
        'configuration', oi.configuration
      ) ORDER BY oi.id) FROM public.order_items oi WHERE oi.order_id = o.id),
      '[]'::jsonb
    )
  FROM public.orders o
  WHERE o.store_id = _store_id
    AND o.customer_phone = trim(_phone)
  ORDER BY o.created_at DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_orders(uuid, text) TO anon, authenticated;