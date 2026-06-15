-- ============================================================
-- COPIAR TUDO e colar no SQL Editor da Lovable → Run
-- Corrige erro ao aprovar login Google da equipa
-- ============================================================

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
      SELECT 1 FROM public.user_roles ur_mgr
      WHERE ur_mgr.user_id = auth.uid()
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
    full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name),
    preferred_language = COALESCE(NULLIF(trim(EXCLUDED.preferred_language), ''), public.profiles.preferred_language),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
    avatar_url = COALESCE(NULLIF(trim(EXCLUDED.avatar_url), ''), public.profiles.avatar_url),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_profile_by_manager(uuid, text, text, date, text) TO authenticated;

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

  v_role_id := public.add_team_member_to_store(
    v_row.user_id,
    _role,
    v_row.store_id,
    v_row.tenant_id
  );

  PERFORM public.upsert_staff_profile_by_manager(
    v_row.user_id,
    COALESCE(NULLIF(trim(_full_name), ''), v_row.full_name),
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es'),
    NULL::date,
    NULL::text
  );

  DELETE FROM public.staff_google_pending WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_role_id', v_role_id,
    'user_id', v_row.user_id,
    'role', _role::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_staff_google_pending(uuid, public.app_role, text, text) TO authenticated;

SELECT 'Login Google da equipa corrigido com sucesso' AS resultado;
