
-- 1) customer_saved_profiles: remover acesso público; manter só via RPC SECURITY DEFINER
DROP POLICY IF EXISTS "Public read saved customer profiles" ON public.customer_saved_profiles;
DROP POLICY IF EXISTS "Public upsert saved customer profiles" ON public.customer_saved_profiles;
DROP POLICY IF EXISTS "Public update saved customer profiles" ON public.customer_saved_profiles;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.customer_saved_profiles FROM anon;
REVOKE SELECT, INSERT, UPDATE ON public.customer_saved_profiles FROM authenticated;

-- Admin master / tenant members podem auditar manualmente se precisarem
CREATE POLICY "Tenant members read saved customer profiles"
ON public.customer_saved_profiles
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR public.user_can_access_store(auth.uid(), store_id)
);

GRANT SELECT ON public.customer_saved_profiles TO authenticated;
GRANT ALL ON public.customer_saved_profiles TO service_role;

-- 2) orders: restringir o que o anon pode inserir directamente
DROP POLICY IF EXISTS "Anon can insert orders for active stores" ON public.orders;
CREATE POLICY "Anon can insert orders for active stores"
ON public.orders
FOR INSERT TO anon
WITH CHECK (
  store_id IN (SELECT s.id FROM public.stores s WHERE s.is_active = true)
  AND payment_status = 'pending'::public.payment_status
  AND stripe_payment_intent_id IS NULL
  AND COALESCE(application_fee_cents, 0) = 0
  AND COALESCE(online_service_fee_cents, 0) = 0
  AND COALESCE(platform_fee_cents, 0) = 0
  AND COALESCE(stripe_fee_cents, 0) = 0
  AND net_to_store_cents IS NULL
);

-- 3) stores: anon não vê colunas Stripe
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (
  id, tenant_id, name, address, phone, is_active, created_at, updated_at,
  image_url, sort_order, short_description, latitude, longitude, geocoded_address
) ON public.stores TO anon;
