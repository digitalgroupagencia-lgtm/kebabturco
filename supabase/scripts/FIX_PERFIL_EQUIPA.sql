-- Perfil da equipa: foto, data de nascimento (executar no Supabase kvpssbhclafoymhecmuk)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

CREATE OR REPLACE FUNCTION public.upsert_my_staff_profile(
  _full_name text DEFAULT NULL,
  _birth_date date DEFAULT NULL,
  _avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid
  ) INTO v_is_staff;

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Sem permissão para actualizar perfil da equipa';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, birth_date, avatar_url)
  VALUES (
    v_uid,
    NULLIF(trim(_full_name), ''),
    _birth_date,
    NULLIF(trim(_avatar_url), '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
    avatar_url = COALESCE(NULLIF(trim(EXCLUDED.avatar_url), ''), public.profiles.avatar_url),
    updated_at = now();
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.upsert_my_staff_profile(text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_staff_profile_by_manager(uuid, text, text, date, text) TO authenticated;

SELECT 'perfil_equipa_ok' AS status;
