-- Equipa: verificação de PIN, emails no painel e perfil pelo gerente (aplicado via Publish Lovable)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.verify_staff_access_pin(_store_id uuid, _pin text)
RETURNS TABLE(user_id uuid, role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT sap.user_id, ur.role
  FROM public.staff_access_pins sap
  JOIN public.user_roles ur ON ur.id = sap.user_role_id
  WHERE sap.store_id = _store_id
    AND sap.is_active
    AND ur.store_id = _store_id
    AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_store_team_member_emails(_store_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF _store_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.store_id = _store_id
         AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
     ) THEN
    RAISE EXCEPTION 'Sem permissão para ver emails da equipa';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, u.email::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.store_id = _store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_team_member_emails(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_staff_profile_by_manager(
  _user_id uuid,
  _full_name text DEFAULT NULL,
  _preferred_language text DEFAULT 'es'
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

  INSERT INTO public.profiles (user_id, full_name, preferred_language)
  VALUES (
    _user_id,
    NULLIF(trim(_full_name), ''),
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name),
    preferred_language = COALESCE(NULLIF(trim(EXCLUDED.preferred_language), ''), public.profiles.preferred_language),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_profile_by_manager(uuid, text, text) TO authenticated;
