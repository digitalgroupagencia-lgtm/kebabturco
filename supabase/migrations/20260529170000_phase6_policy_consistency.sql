-- Fase 6 — Consistência de policies (coupons, fidelidade, campanhas, company_settings)

DROP POLICY IF EXISTS "Tenant manage coupons" ON public.coupons;
CREATE POLICY "Tenant manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Tenant manage loyalty" ON public.loyalty_accounts;
CREATE POLICY "Tenant manage loyalty"
  ON public.loyalty_accounts FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Tenant manage campaigns" ON public.marketing_campaigns;
CREATE POLICY "Tenant manage campaigns"
  ON public.marketing_campaigns FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Tenant members manage company_settings" ON public.company_settings;
CREATE POLICY "Tenant members manage company_settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

-- platform_settings: leitura só admin (opcional — reduz exposição)
DROP POLICY IF EXISTS "Public can read platform_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Authenticated read platform_settings" ON public.platform_settings;
CREATE POLICY "Authenticated read platform_settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));
