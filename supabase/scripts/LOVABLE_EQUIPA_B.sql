CREATE OR REPLACE FUNCTION public.user_can_view_team_at_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(_store_id);
$fn$;

SELECT 'B OK' AS passo;
