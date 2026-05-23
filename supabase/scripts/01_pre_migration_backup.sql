-- Pre-migration backup checklist (run BEFORE 20260524120000_delivery_tracking_loyalty.sql)
-- Project: kvpssbhclafoymhecmuk (Kebab Turco)
--
-- 1. In Supabase Dashboard → Project Settings → Database → create a backup/snapshot
-- 2. Run this script in SQL Editor and save the output (row counts + checksums)

SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM public.orders
UNION ALL SELECT 'order_items', COUNT(*) FROM public.order_items
UNION ALL SELECT 'stores', COUNT(*) FROM public.stores
UNION ALL SELECT 'products', COUNT(*) FROM public.products
UNION ALL SELECT 'delivery_zones', COUNT(*) FROM public.delivery_zones
ORDER BY table_name;

-- Recent orders sample (verify data looks correct before migration)
SELECT id, order_number, status, order_type, total, created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;

-- Confirm migration not yet applied (should error or return 0 rows if columns missing)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('delivery_street', 'delivery_fee', 'coupon_code', 'customer_id');
