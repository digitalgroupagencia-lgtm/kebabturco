-- Gráficos e mapas do admin: só vendas reais (excluir pedidos de teste).

CREATE OR REPLACE FUNCTION public.get_monthly_revenue_series()
RETURNS TABLE(month_label TEXT, month_date DATE, revenue NUMERIC, order_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now()) - INTERVAL '11 months',
      date_trunc('month', now()),
      '1 month'
    )::date AS m
  )
  SELECT
    to_char(months.m, 'Mon/YY') AS month_label,
    months.m AS month_date,
    COALESCE(SUM(o.total), 0) AS revenue,
    COALESCE(COUNT(o.id), 0)::bigint AS order_count
  FROM months
  LEFT JOIN orders o
    ON date_trunc('month', o.created_at)::date = months.m
   AND o.status != 'cancelled'
   AND o.is_test = false
  GROUP BY months.m
  ORDER BY months.m;
$$;

CREATE OR REPLACE FUNCTION public.get_orders_heatmap()
RETURNS TABLE(day_of_week INTEGER, hour_of_day INTEGER, order_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXTRACT(DOW FROM created_at)::int AS day_of_week,
    EXTRACT(HOUR FROM created_at)::int AS hour_of_day,
    COUNT(*)::bigint
  FROM orders
  WHERE created_at >= now() - INTERVAL '30 days'
    AND status != 'cancelled'
    AND is_test = false
  GROUP BY day_of_week, hour_of_day;
$$;
