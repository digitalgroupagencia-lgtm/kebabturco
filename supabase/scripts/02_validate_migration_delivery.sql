-- Post-migration validation (run AFTER 20260524120000_delivery_tracking_loyalty.sql)

-- New columns on orders
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN (
    'delivery_street', 'delivery_number', 'delivery_complement',
    'delivery_postal_code', 'delivery_city', 'delivery_notes',
    'delivery_fee', 'delivery_zone_id', 'delivery_zone_name',
    'discount_amount', 'coupon_code', 'customer_id', 'estimated_ready_at'
  )
ORDER BY column_name;

-- order_status enum includes out_for_delivery
SELECT unnest(enum_range(NULL::public.order_status)) AS order_status_values;

-- New tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'customers', 'coupons', 'coupon_redemptions',
    'loyalty_accounts', 'push_subscriptions', 'marketing_campaigns'
  )
ORDER BY table_name;

-- create_customer_order function exists with delivery params
SELECT p.proname, pg_get_function_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_customer_order', 'validate_coupon', 'get_customer_orders',
    'add_loyalty_stamp', 'get_loyalty_status', 'get_order_public'
  )
ORDER BY p.proname;

-- RLS enabled on new tables
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('customers', 'coupons', 'loyalty_accounts', 'push_subscriptions')
  AND relnamespace = 'public'::regnamespace;
