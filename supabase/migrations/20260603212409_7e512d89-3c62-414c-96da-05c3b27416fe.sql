
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_is_test ON public.orders(is_test) WHERE is_test = true;

CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_is_test boolean := false;
BEGIN
  SELECT is_test INTO v_is_test FROM public.orders WHERE id = NEW.order_id;
  IF COALESCE(v_is_test, false) THEN RETURN NEW; END IF;
  UPDATE public.stock_items si
  SET current_qty = si.current_qty - (ps.qty_per_unit * NEW.quantity)
  FROM public.product_stock ps
  WHERE ps.product_id = NEW.product_id AND ps.stock_item_id = si.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_sales_summary(_store_id uuid, _since timestamp with time zone)
 RETURNS TABLE(total_orders bigint, total_revenue numeric, avg_ticket numeric, total_cancelled bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT 
    COUNT(*) FILTER (WHERE status != 'cancelled')::bigint,
    COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0),
    COALESCE(AVG(total) FILTER (WHERE status != 'cancelled'), 0),
    COUNT(*) FILTER (WHERE status = 'cancelled')::bigint
  FROM public.orders
  WHERE store_id = _store_id AND created_at >= _since AND is_test = false;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_products(_store_id uuid, _since timestamp with time zone, _limit integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, product_name text, total_qty bigint, total_revenue numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::bigint, SUM(oi.total_price)
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.store_id = _store_id AND o.created_at >= _since
    AND o.status != 'cancelled' AND o.is_test = false
  GROUP BY oi.product_id, oi.product_name
  ORDER BY SUM(oi.quantity) DESC
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_hourly_sales(_store_id uuid, _since timestamp with time zone)
 RETURNS TABLE(hour integer, order_count bigint, revenue numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXTRACT(HOUR FROM created_at)::int, COUNT(*)::bigint, COALESCE(SUM(total), 0)
  FROM public.orders
  WHERE store_id = _store_id AND created_at >= _since AND status != 'cancelled' AND is_test = false
  GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS TABLE(mrr numeric, paid_count bigint, pending_count bigint, overdue_count bigint, total_tenants bigint, active_tenants bigint, orders_today bigint, revenue_today numeric, revenue_month numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((SELECT SUM(monthly_amount) FROM tenant_subscriptions WHERE status IN ('paid','pending')), 0),
    COALESCE((SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'paid'), 0),
    COALESCE((SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'pending'), 0),
    COALESCE((SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'overdue'), 0),
    COALESCE((SELECT COUNT(*) FROM tenants), 0),
    COALESCE((SELECT COUNT(*) FROM tenants WHERE is_active = true), 0),
    COALESCE((SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled' AND is_test = false), 0),
    COALESCE((SELECT SUM(total) FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled' AND is_test = false), 0),
    COALESCE((SELECT SUM(total) FROM orders WHERE created_at >= date_trunc('month', now()) AND status != 'cancelled' AND is_test = false), 0);
$function$;

CREATE OR REPLACE FUNCTION public.get_top_tenants_by_revenue(_limit integer DEFAULT 5)
 RETURNS TABLE(tenant_id uuid, tenant_name text, total_revenue numeric, order_count bigint)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT t.id AS tenant_id, t.name AS tenant_name,
         COALESCE(SUM(o.total), 0) AS total_revenue,
         COALESCE(COUNT(o.id), 0)::bigint AS order_count
  FROM tenants t
  LEFT JOIN stores s ON s.tenant_id = t.id
  LEFT JOIN orders o ON o.store_id = s.id
    AND o.created_at >= date_trunc('month', now())
    AND o.status != 'cancelled'
    AND o.is_test = false
  GROUP BY t.id, t.name
  ORDER BY COALESCE(SUM(o.total), 0) DESC
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_monthly_usage(_tenant_id uuid)
 RETURNS TABLE(used bigint, limit_max integer, pct numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((
      SELECT COUNT(*)::bigint FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE s.tenant_id = _tenant_id
        AND o.created_at >= date_trunc('month', now())
        AND o.status != 'cancelled'
        AND o.is_test = false
    ), 0), 0, 0::numeric;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_test_orders(_store_id uuid DEFAULT NULL, _older_than interval DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_count bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  WITH d AS (
    DELETE FROM public.orders
    WHERE is_test = true
      AND (_store_id IS NULL OR store_id = _store_id)
      AND (_older_than IS NULL OR created_at < now() - _older_than)
    RETURNING 1
  ) SELECT COUNT(*) INTO v_count FROM d;
  RETURN jsonb_build_object('deleted', v_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.advance_test_order_status(_order_id uuid, _new_status text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL OR v_order.is_test = false THEN
    RAISE EXCEPTION 'Order not found or not a test order';
  END IF;
  UPDATE public.orders SET status = _new_status::public.order_status, updated_at = now() WHERE id = _order_id;
  RETURN jsonb_build_object('success', true, 'status', _new_status);
END;
$function$;
