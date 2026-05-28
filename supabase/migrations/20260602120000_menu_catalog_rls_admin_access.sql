-- Cardápio no admin: admin_master e user_can_access_store (igual coupons/fase 6).
-- Corrige cardápio vazio quando get_user_tenant_id() é NULL para admin geral.

DROP POLICY IF EXISTS "Tenant members manage categories" ON public.categories;
CREATE POLICY "Tenant manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Tenant members manage products" ON public.products;
CREATE POLICY "Tenant manage products"
  ON public.products FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Tenant members manage product_sizes" ON public.product_sizes;
CREATE POLICY "Tenant manage product_sizes"
  ON public.product_sizes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  );

DROP POLICY IF EXISTS "Tenant members manage product_extras" ON public.product_extras;
CREATE POLICY "Tenant manage product_extras"
  ON public.product_extras FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  );

-- Personalização (grupos de modificadores) — mesma regra que cardápio
DROP POLICY IF EXISTS "Tenant manage modifier groups" ON public.modifier_groups;
CREATE POLICY "Tenant manage modifier groups"
  ON public.modifier_groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Tenant manage modifier options" ON public.modifier_options;
CREATE POLICY "Tenant manage modifier options"
  ON public.modifier_options FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
        AND public.user_can_access_store(mg.store_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
        AND public.user_can_access_store(mg.store_id)
    )
  );

DROP POLICY IF EXISTS "Tenant manage product modifier groups" ON public.product_modifier_groups;
CREATE POLICY "Tenant manage product modifier groups"
  ON public.product_modifier_groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  );
