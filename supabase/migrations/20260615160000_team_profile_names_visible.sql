-- Nomes da equipa: gerentes podem ver e guardar perfis de todos na loja.

DROP POLICY IF EXISTS "Store team managers view member profiles" ON public.profiles;
CREATE POLICY "Store team managers view member profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur_mgr
    JOIN public.user_roles ur_member ON ur_member.store_id = ur_mgr.store_id
    WHERE ur_mgr.user_id = auth.uid()
      AND ur_member.user_id = profiles.user_id
      AND ur_mgr.store_id IS NOT NULL
      AND ur_mgr.role IN (
        'restaurant_admin'::public.app_role,
        'manager'::public.app_role
      )
  )
);

DROP FUNCTION IF EXISTS public.upsert_staff_profile_by_manager(uuid, text, text);

CREATE OR REPLACE FUNCTION public.upsert_staff_profile_by_manager(
  _user_id uuid,
  _full_name text DEFAULT NULL,
  _preferred_language text DEFAULT 'es',
  _birth_date date DEFAULT NULL,
  _avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_manage boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador inválido';
  END IF;

  v_can_manage := public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur_mgr
      JOIN public.user_roles ur_target ON ur_target.store_id = ur_mgr.store_id
      WHERE ur_mgr.user_id = auth.uid()
        AND ur_target.user_id = _user_id
        AND ur_mgr.store_id IS NOT NULL
        AND ur_mgr.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sem permissão para actualizar perfil da equipa';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, preferred_language, birth_date, avatar_url)
  VALUES (
    _user_id,
    NULLIF(trim(_full_name), ''),
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es'),
    _birth_date,
    NULLIF(trim(_avatar_url), '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE
      WHEN NULLIF(trim(EXCLUDED.full_name), '') IS NOT NULL THEN NULLIF(trim(EXCLUDED.full_name), '')
      ELSE public.profiles.full_name
    END,
    preferred_language = COALESCE(NULLIF(trim(EXCLUDED.preferred_language), ''), public.profiles.preferred_language),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
    avatar_url = COALESCE(NULLIF(trim(EXCLUDED.avatar_url), ''), public.profiles.avatar_url),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_profile_by_manager(uuid, text, text, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_store_team_members(_store_id uuid)
RETURNS TABLE(
  user_role_id uuid,
  user_id uuid,
  role public.app_role,
  email text,
  full_name text,
  preferred_language text,
  birth_date date,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF _store_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.user_can_view_team_at_store(_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para ver a equipa desta loja';
  END IF;

  RETURN QUERY
  SELECT
    ur.id,
    ur.user_id,
    ur.role,
    u.email::text,
    p.full_name,
    COALESCE(NULLIF(trim(p.preferred_language), ''), 'es'),
    p.birth_date,
    p.avatar_url
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.store_id = _store_id
  ORDER BY COALESCE(p.full_name, u.email::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_team_members(uuid) TO authenticated;
