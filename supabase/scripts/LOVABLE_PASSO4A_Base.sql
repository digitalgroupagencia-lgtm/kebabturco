-- PASSO 4A — Query NOVA (parte 1 de 3)
-- Funções base + regras de acesso

CREATE OR REPLACE FUNCTION public.user_can_access_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role = 'admin_master'::public.app_role
        OR ur.store_id = _store_id
        OR (
          ur.tenant_id IS NOT NULL
          AND ur.tenant_id = (SELECT s.tenant_id FROM public.stores s WHERE s.id = _store_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_delivery_driver(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'delivery'::public.app_role
      AND ur.store_id = _store_id
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_pin_in_use(
  _store_id uuid,
  _pin text,
  _exclude_role_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_access_pins sap
    WHERE sap.store_id = _store_id
      AND sap.is_active
      AND (_exclude_role_id IS NULL OR sap.user_role_id <> _exclude_role_id)
      AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  );
$$;

ALTER TABLE public.staff_access_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers manage staff pins" ON public.staff_access_pins;
CREATE POLICY "Store managers manage staff pins" ON public.staff_access_pins
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR store_id IN (
    SELECT ur.store_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
      AND ur.store_id IS NOT NULL
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR store_id IN (
    SELECT ur.store_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
      AND ur.store_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Store staff view pin status" ON public.staff_access_pins;
CREATE POLICY "Store staff view pin status" ON public.staff_access_pins
FOR SELECT TO authenticated
USING (
  public.user_can_access_store(store_id)
);

DROP POLICY IF EXISTS "Restaurant admin manage store team" ON public.user_roles;
CREATE POLICY "Restaurant admin manage store team" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND store_id IN (
      SELECT ur.store_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
        AND ur.store_id IS NOT NULL
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND store_id IN (
      SELECT ur.store_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
        AND ur.store_id IS NOT NULL
    )
    AND role NOT IN ('admin_master'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Store staff view team" ON public.user_roles;
CREATE POLICY "Store staff view team" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND store_id IN (
      SELECT ur.store_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.store_id IS NOT NULL
    )
  )
);

SELECT 'Passo 4A OK' AS status;
