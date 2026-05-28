-- Corrige "infinite recursion detected in policy for relation user_roles"
-- As políticas antigas consultavam user_roles dentro de user_roles.

CREATE OR REPLACE FUNCTION public.user_manages_store_team(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = _store_id
        AND ur.role IN (
          'restaurant_admin'::public.app_role,
          'manager'::public.app_role
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_team_at_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(_store_id);
$$;

DROP POLICY IF EXISTS "Restaurant admin manage store team" ON public.user_roles;
CREATE POLICY "Restaurant admin manage store team" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND public.user_manages_store_team(store_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND public.user_manages_store_team(store_id)
    AND role <> 'admin_master'::public.app_role
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
    AND public.user_can_view_team_at_store(store_id)
  )
);

CREATE OR REPLACE FUNCTION public.add_team_member_to_store(
  _user_id uuid,
  _role public.app_role,
  _store_id uuid,
  _tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF _user_id IS NULL OR _store_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Dados incompletos para adicionar membro';
  END IF;

  IF _role = 'admin_master'::public.app_role THEN
    RAISE EXCEPTION 'Papel inválido para a equipa da loja';
  END IF;

  IF NOT public.user_manages_store_team(_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para adicionar membros a esta loja';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Esta pessoa já faz parte da equipa desta loja.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, store_id, tenant_id)
  VALUES (_user_id, _role, _store_id, _tenant_id)
  RETURNING id INTO v_role_id;

  RETURN v_role_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_manages_store_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_team_at_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_team_member_to_store(uuid, public.app_role, uuid, uuid) TO authenticated;
