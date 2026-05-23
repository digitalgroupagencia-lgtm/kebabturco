-- Fase 1 — Isolamento de tenant (funções base, baixo risco)
-- Não altera policies de customers/push/print ainda.
-- admin_master continua via has_role() nas políticas existentes.

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT ur.tenant_id
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.tenant_id IS NOT NULL
        AND ur.role IN (
          'restaurant_admin'::public.app_role,
          'operator'::public.app_role,
          'kitchen'::public.app_role
        )
      ORDER BY
        CASE ur.role
          WHEN 'restaurant_admin'::public.app_role THEN 1
          WHEN 'operator'::public.app_role THEN 2
          WHEN 'kitchen'::public.app_role THEN 3
          ELSE 9
        END,
        ur.created_at ASC
      LIMIT 1
    ),
    (
      SELECT s.tenant_id
      FROM public.user_roles ur
      INNER JOIN public.stores s ON s.id = ur.store_id
      WHERE ur.user_id = _user_id
        AND ur.store_id IS NOT NULL
      ORDER BY ur.created_at ASC
      LIMIT 1
    )
  );
$$;

COMMENT ON FUNCTION public.get_user_tenant_id(uuid) IS
  'Resolve tenant_id do utilizador: roles restaurante com tenant_id, ou via store_id. admin_master usa políticas has_role separadas.';

CREATE OR REPLACE FUNCTION public.user_can_access_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR (
      _tenant_id IS NOT NULL
      AND public.get_user_tenant_id(auth.uid()) = _tenant_id
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_store(_store_id uuid)
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
      FROM public.stores s
      WHERE s.id = _store_id
        AND s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = _store_id
    );
$$;

COMMENT ON FUNCTION public.user_can_access_tenant(uuid) IS
  'True se admin_master ou tenant do utilizador coincide.';

COMMENT ON FUNCTION public.user_can_access_store(uuid) IS
  'True se admin_master, loja do tenant do utilizador, ou store_id directo em user_roles.';

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_store(uuid) TO authenticated;
