-- Restringir leitura/escrita de secret_key e configurações de pagamento aos admins
DROP POLICY IF EXISTS spg_tenant_members_all ON public.store_payment_gateways;

CREATE POLICY spg_tenant_admins_all
  ON public.store_payment_gateways
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    AND (
      public.has_role(auth.uid(), 'admin_master'::app_role)
      OR public.has_role(auth.uid(), 'restaurant_admin'::app_role)
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    AND (
      public.has_role(auth.uid(), 'admin_master'::app_role)
      OR public.has_role(auth.uid(), 'restaurant_admin'::app_role)
    )
  );