-- Guardar e ler perfis da equipa de forma fiável (nomes, datas, fotos).

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
      WHEN _full_name IS NOT NULL THEN NULLIF(trim(_full_name), '')
      ELSE public.profiles.full_name
    END,
    preferred_language = COALESCE(NULLIF(trim(EXCLUDED.preferred_language), ''), public.profiles.preferred_language),
    birth_date = CASE WHEN _birth_date IS NOT NULL THEN _birth_date ELSE public.profiles.birth_date END,
    avatar_url = CASE
      WHEN _avatar_url IS NOT NULL THEN NULLIF(trim(_avatar_url), '')
      ELSE public.profiles.avatar_url
    END,
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
    COALESCE(
      NULLIF(trim(p.full_name), ''),
      NULLIF(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(u.email::text, '@', 1)
    ) AS full_name,
    COALESCE(NULLIF(trim(p.preferred_language), ''), 'es'),
    p.birth_date,
    p.avatar_url
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.store_id = _store_id
  ORDER BY 5, u.email::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_team_members(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_team_member_by_manager(
  _store_id uuid,
  _user_role_id uuid,
  _user_id uuid,
  _full_name text,
  _preferred_language text DEFAULT 'es',
  _birth_date date DEFAULT NULL,
  _role public.app_role DEFAULT NULL,
  _access_pin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF _store_id IS NULL OR _user_role_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION 'Dados incompletos';
  END IF;

  IF NULLIF(trim(_full_name), '') IS NULL THEN
    RAISE EXCEPTION 'O nome é obrigatório';
  END IF;

  IF NOT public.user_manages_store_team(_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta equipa';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.id = _user_role_id
      AND ur.user_id = _user_id
      AND ur.store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Membro da equipa não encontrado nesta loja';
  END IF;

  IF _role IS NOT NULL AND _role <> 'admin_master'::public.app_role THEN
    UPDATE public.user_roles
    SET role = _role
    WHERE id = _user_role_id;
  END IF;

  PERFORM public.upsert_staff_profile_by_manager(
    _user_id,
    trim(_full_name),
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es'),
    _birth_date,
    NULL
  );

  IF _access_pin IS NOT NULL AND trim(_access_pin) <> '' THEN
    PERFORM public.upsert_staff_access_pin(_user_role_id, trim(_access_pin));
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_role_id', _user_role_id,
    'user_id', _user_id,
    'full_name', v_profile.full_name,
    'preferred_language', v_profile.preferred_language,
    'birth_date', v_profile.birth_date,
    'avatar_url', v_profile.avatar_url,
    'role', (SELECT ur.role::text FROM public.user_roles ur WHERE ur.id = _user_role_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_team_member_by_manager(
  uuid, uuid, uuid, text, text, date, public.app_role, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_staff_google_pending(
  _pending_id uuid,
  _role public.app_role,
  _full_name text DEFAULT NULL,
  _preferred_language text DEFAULT 'es'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.staff_google_pending%ROWTYPE;
  v_role_id uuid;
  v_name text;
BEGIN
  IF _pending_id IS NULL THEN
    RAISE EXCEPTION 'Pedido inválido';
  END IF;

  IF _role = 'admin_master'::public.app_role THEN
    RAISE EXCEPTION 'Papel inválido para a equipa da loja';
  END IF;

  SELECT * INTO v_row
  FROM public.staff_google_pending
  WHERE id = _pending_id AND status = 'pending'
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já tratado';
  END IF;

  IF NOT public.user_manages_store_team(v_row.store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar este pedido';
  END IF;

  v_name := COALESCE(NULLIF(trim(_full_name), ''), NULLIF(trim(v_row.full_name), ''), split_part(v_row.email, '@', 1));

  v_role_id := public.add_team_member_to_store(
    v_row.user_id,
    _role,
    v_row.store_id,
    v_row.tenant_id
  );

  PERFORM public.upsert_staff_profile_by_manager(
    v_row.user_id,
    v_name,
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es'),
    NULL::date,
    NULL::text
  );

  DELETE FROM public.staff_google_pending WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_role_id', v_role_id,
    'user_id', v_row.user_id,
    'role', _role::text,
    'full_name', v_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_staff_google_pending(uuid, public.app_role, text, text) TO authenticated;
