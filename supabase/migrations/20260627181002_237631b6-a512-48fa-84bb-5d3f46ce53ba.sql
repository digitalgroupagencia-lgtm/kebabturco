DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
  END LOOP;
END $$;

DO $$
DECLARE
  anon_read text[] := ARRAY[
    'stores','categories','products','product_sizes','product_extras','product_stock',
    'promo_banners','splash_media','operations_settings','company_settings','tenants',
    'totem_config','tables','delivery_zones','tenant_loyalty_programs',
    'platform_push_config','platform_settings'
  ];
  anon_write text[] := ARRAY[
    'orders','order_items','customers','customer_saved_profiles',
    'customer_order_feedback','push_subscriptions',
    'order_support_threads','order_support_messages',
    'table_sessions','table_session_customers'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY anon_read LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t AND c.relkind='r') THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY anon_write LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t AND c.relkind='r') THEN
      EXECUTE format('GRANT SELECT, INSERT ON public.%I TO anon', t);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='order_reviews' AND c.relkind='r') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.order_reviews TO anon';
  END IF;
END $$;