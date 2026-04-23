CREATE OR REPLACE FUNCTION public.get_tenant_monthly_usage(_tenant_id uuid)
RETURNS TABLE(used bigint, limit_max integer, pct numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE s.tenant_id = _tenant_id
        AND o.created_at >= date_trunc('month', now())
        AND o.status != 'cancelled'
    ), 0) AS used,
    COALESCE((SELECT max_orders_month FROM public.tenants WHERE id = _tenant_id), 500) AS limit_max,
    CASE
      WHEN COALESCE((SELECT max_orders_month FROM public.tenants WHERE id = _tenant_id), 500) = 0 THEN 0
      ELSE ROUND(
        (COALESCE((
          SELECT COUNT(*)::numeric
          FROM public.orders o
          JOIN public.stores s ON s.id = o.store_id
          WHERE s.tenant_id = _tenant_id
            AND o.created_at >= date_trunc('month', now())
            AND o.status != 'cancelled'
        ), 0) / COALESCE((SELECT max_orders_month FROM public.tenants WHERE id = _tenant_id), 500)::numeric) * 100,
        1
      )
    END AS pct;
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_over_limit(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (used >= limit_max) FROM public.get_tenant_monthly_usage(_tenant_id);
$$;