DROP POLICY IF EXISTS "Restaurant admin manage store team" ON public.user_roles;
CREATE POLICY "Restaurant admin manage store team" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (store_id IS NOT NULL AND public.user_manages_store_team(store_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND public.user_manages_store_team(store_id)
    AND role <> 'admin_master'::public.app_role
  )
);

SELECT 'C OK' AS passo;
