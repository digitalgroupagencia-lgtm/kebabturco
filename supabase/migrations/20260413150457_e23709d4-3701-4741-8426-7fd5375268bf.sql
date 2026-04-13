
-- Function to deduct stock when order items are inserted
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stock_items si
  SET current_qty = si.current_qty - (ps.qty_per_unit * NEW.quantity)
  FROM public.product_stock ps
  WHERE ps.product_id = NEW.product_id
    AND ps.stock_item_id = si.id;
  RETURN NEW;
END;
$$;

-- Trigger on order_items insert
CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order_item();

-- Function to get top selling products (avoids complex RLS issues in views)
CREATE OR REPLACE FUNCTION public.get_top_products(_store_id uuid, _since timestamptz, _limit int DEFAULT 10)
RETURNS TABLE(product_id uuid, product_name text, total_qty bigint, total_revenue numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::bigint as total_qty, SUM(oi.total_price) as total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.store_id = _store_id
    AND o.created_at >= _since
    AND o.status != 'cancelled'
  GROUP BY oi.product_id, oi.product_name
  ORDER BY total_qty DESC
  LIMIT _limit;
$$;

-- Function to get sales summary by period
CREATE OR REPLACE FUNCTION public.get_sales_summary(_store_id uuid, _since timestamptz)
RETURNS TABLE(total_orders bigint, total_revenue numeric, avg_ticket numeric, total_cancelled bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE status != 'cancelled')::bigint as total_orders,
    COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0) as total_revenue,
    COALESCE(AVG(total) FILTER (WHERE status != 'cancelled'), 0) as avg_ticket,
    COUNT(*) FILTER (WHERE status = 'cancelled')::bigint as total_cancelled
  FROM public.orders
  WHERE store_id = _store_id AND created_at >= _since;
$$;

-- Function to get hourly sales distribution
CREATE OR REPLACE FUNCTION public.get_hourly_sales(_store_id uuid, _since timestamptz)
RETURNS TABLE(hour int, order_count bigint, revenue numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(HOUR FROM created_at)::int as hour,
    COUNT(*)::bigint as order_count,
    COALESCE(SUM(total), 0) as revenue
  FROM public.orders
  WHERE store_id = _store_id AND created_at >= _since AND status != 'cancelled'
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour;
$$;
