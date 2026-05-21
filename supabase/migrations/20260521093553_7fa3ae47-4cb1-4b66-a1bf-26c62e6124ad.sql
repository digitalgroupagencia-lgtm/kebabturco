DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
CREATE POLICY "Public can read active categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Public can read active products" ON public.products;
CREATE POLICY "Public can read active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Public can read active tenants" ON public.tenants;
CREATE POLICY "Public can read active tenants"
ON public.tenants
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Public can read active stores" ON public.stores;
CREATE POLICY "Public can read active stores"
ON public.stores
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Public can read totem_config" ON public.totem_config;
CREATE POLICY "Public can read totem_config"
ON public.totem_config
FOR SELECT
TO anon, authenticated
USING (true);