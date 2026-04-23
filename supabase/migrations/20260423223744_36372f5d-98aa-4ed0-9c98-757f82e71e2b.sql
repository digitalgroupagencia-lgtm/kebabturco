-- ============================================
-- TENANT SUBSCRIPTIONS (cobrança mensal)
-- ============================================
CREATE TABLE public.tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  billing_day INTEGER NOT NULL DEFAULT 1 CHECK (billing_day >= 1 AND billing_day <= 28),
  next_due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  last_payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','cancelled','trial')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manage tenant_subscriptions"
ON public.tenant_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Tenant can view own subscription"
ON public.tenant_subscriptions FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_tenant_subscriptions_updated_at
BEFORE UPDATE ON public.tenant_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PAYMENT HISTORY
-- ============================================
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'manual',
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master manage payment_history"
ON public.payment_history FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Tenant can view own payment_history"
ON public.payment_history FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE INDEX idx_payment_history_tenant ON public.payment_history(tenant_id, paid_at DESC);

-- ============================================
-- DASHBOARD STATS FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(
  mrr NUMERIC,
  paid_count BIGINT,
  pending_count BIGINT,
  overdue_count BIGINT,
  total_tenants BIGINT,
  active_tenants BIGINT,
  orders_today BIGINT,
  revenue_today NUMERIC,
  revenue_month NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(monthly_amount) FROM tenant_subscriptions WHERE status IN ('paid','pending')), 0) AS mrr,
    COALESCE((SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'paid'), 0) AS paid_count,
    COALESCE((SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'pending'), 0) AS pending_count,
    COALESCE((SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'overdue'), 0) AS overdue_count,
    COALESCE((SELECT COUNT(*) FROM tenants), 0) AS total_tenants,
    COALESCE((SELECT COUNT(*) FROM tenants WHERE is_active = true), 0) AS active_tenants,
    COALESCE((SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled'), 0) AS orders_today,
    COALESCE((SELECT SUM(total) FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled'), 0) AS revenue_today,
    COALESCE((SELECT SUM(total) FROM orders WHERE created_at >= date_trunc('month', now()) AND status != 'cancelled'), 0) AS revenue_month;
$$;

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
  LEFT JOIN orders o ON date_trunc('month', o.created_at)::date = months.m AND o.status != 'cancelled'
  GROUP BY months.m
  ORDER BY months.m;
$$;

CREATE OR REPLACE FUNCTION public.get_top_tenants_by_revenue(_limit INTEGER DEFAULT 5)
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, total_revenue NUMERIC, order_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.name, COALESCE(SUM(o.total), 0) AS total_revenue, COALESCE(COUNT(o.id), 0)::bigint
  FROM tenants t
  LEFT JOIN stores s ON s.tenant_id = t.id
  LEFT JOIN orders o ON o.store_id = s.id
    AND o.created_at >= date_trunc('month', now())
    AND o.status != 'cancelled'
  GROUP BY t.id, t.name
  ORDER BY total_revenue DESC
  LIMIT _limit;
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
  WHERE created_at >= now() - INTERVAL '30 days' AND status != 'cancelled'
  GROUP BY day_of_week, hour_of_day;
$$;

CREATE OR REPLACE FUNCTION public.get_upcoming_payments()
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
  monthly_amount NUMERIC,
  currency TEXT,
  next_due_date DATE,
  status TEXT,
  days_until_due INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    ts.monthly_amount,
    ts.currency,
    ts.next_due_date,
    ts.status,
    (ts.next_due_date - CURRENT_DATE)::int AS days_until_due
  FROM tenant_subscriptions ts
  JOIN tenants t ON t.id = ts.tenant_id
  ORDER BY ts.next_due_date ASC;
$$;

-- Função de reset de dados por tenant (apaga conforme escopo escolhido)
CREATE OR REPLACE FUNCTION public.reset_tenant_data(
  _tenant_id UUID,
  _reset_orders BOOLEAN DEFAULT true,
  _reset_cash BOOLEAN DEFAULT true,
  _reset_stock BOOLEAN DEFAULT false,
  _reset_products BOOLEAN DEFAULT false,
  _reset_categories BOOLEAN DEFAULT false,
  _reset_banners BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_orders BIGINT := 0;
  v_cash BIGINT := 0;
  v_stock BIGINT := 0;
  v_products BIGINT := 0;
  v_categories BIGINT := 0;
  v_banners BIGINT := 0;
  v_store_ids UUID[];
BEGIN
  -- Permissão: admin_master OU restaurant_admin do próprio tenant
  IF NOT (
    has_role(auth.uid(), 'admin_master'::app_role) OR
    (has_role(auth.uid(), 'restaurant_admin'::app_role) AND get_user_tenant_id(auth.uid()) = _tenant_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT array_agg(id) INTO v_store_ids FROM stores WHERE tenant_id = _tenant_id;
  IF v_store_ids IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deleted', jsonb_build_object('orders',0,'cash',0,'stock',0,'products',0,'categories',0,'banners',0));
  END IF;

  IF _reset_orders THEN
    DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id = ANY(v_store_ids));
    WITH d AS (DELETE FROM orders WHERE store_id = ANY(v_store_ids) RETURNING 1) SELECT COUNT(*) INTO v_orders FROM d;
  END IF;

  IF _reset_cash THEN
    WITH d AS (DELETE FROM cash_registers WHERE store_id = ANY(v_store_ids) RETURNING 1) SELECT COUNT(*) INTO v_cash FROM d;
  END IF;

  IF _reset_stock THEN
    WITH d AS (DELETE FROM stock_items WHERE store_id = ANY(v_store_ids) RETURNING 1) SELECT COUNT(*) INTO v_stock FROM d;
  END IF;

  IF _reset_products THEN
    DELETE FROM product_extras WHERE product_id IN (SELECT id FROM products WHERE store_id = ANY(v_store_ids));
    DELETE FROM product_sizes WHERE product_id IN (SELECT id FROM products WHERE store_id = ANY(v_store_ids));
    DELETE FROM product_stock WHERE product_id IN (SELECT id FROM products WHERE store_id = ANY(v_store_ids));
    WITH d AS (DELETE FROM products WHERE store_id = ANY(v_store_ids) RETURNING 1) SELECT COUNT(*) INTO v_products FROM d;
  END IF;

  IF _reset_categories THEN
    WITH d AS (DELETE FROM categories WHERE store_id = ANY(v_store_ids) RETURNING 1) SELECT COUNT(*) INTO v_categories FROM d;
  END IF;

  IF _reset_banners THEN
    WITH d AS (DELETE FROM promo_banners WHERE store_id = ANY(v_store_ids) RETURNING 1) SELECT COUNT(*) INTO v_banners FROM d;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'orders', v_orders,
      'cash', v_cash,
      'stock', v_stock,
      'products', v_products,
      'categories', v_categories,
      'banners', v_banners
    )
  );
END;
$$;