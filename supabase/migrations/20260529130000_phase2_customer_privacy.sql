-- Fase 2 — Privacidade de clientes e cupões usados

DROP POLICY IF EXISTS "Anon upsert customers via RPC only" ON public.customers;

CREATE POLICY "Tenant read own customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.user_can_access_store(store_id));

CREATE POLICY "Admin master manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

-- coupon_redemptions: RLS activo sem policies
DROP POLICY IF EXISTS "Tenant read coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Tenant read coupon_redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      INNER JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = coupon_redemptions.order_id
        AND public.user_can_access_store(s.id)
    )
  );

DROP POLICY IF EXISTS "Admin master read coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admin master read coupon_redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));

-- Escritas continuam via create_customer_order (SECURITY DEFINER)
