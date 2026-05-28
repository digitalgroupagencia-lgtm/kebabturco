CREATE OR REPLACE FUNCTION public.user_manages_store_team(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = _store_id
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );
$fn$;

SELECT 'A OK' AS passo;
