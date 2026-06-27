-- Restore Data API privileges on public tables (PostgREST cannot read tables without GRANTs).
-- Without these grants, the `orders` UPDATE RLS subquery on `stores` failed with
-- "permission denied for table stores", which surfaced in the panel as "Erro ao actualizar".

DO $$
DECLARE
  t text;
  protected text[] := ARRAY[
    'platform_settings','platform_plans','platform_features','plan_features',
    'platform_push_config','master_visit_print_config'
  ];
  anon_readable text[] := ARRAY[
    'stores','tenants','categories','products','product_sizes','product_extras',
    'promo_banners','splash_media','delivery_zones','operations_settings',
    'company_settings','totem_config'
  ];
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF t = ANY(anon_readable) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;

-- Ensure stores/products are readable by anon for the public menu (RLS still applies).
GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;