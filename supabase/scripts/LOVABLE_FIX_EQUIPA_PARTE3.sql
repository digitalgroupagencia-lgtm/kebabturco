-- PARTE 3 de 3 — colar na Lovable e Run
-- Corrige nome e idioma do novo membro

CREATE OR REPLACE FUNCTION public.upsert_staff_profile_by_manager(
  _user_id uuid,
  _full_name text DEFAULT NULL,
  _preferred_language text DEFAULT 'es'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador invalido';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur_mgr
       WHERE ur_mgr.user_id = auth.uid()
         AND ur_mgr.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
     ) THEN
    RAISE EXCEPTION 'Sem permissao para actualizar perfil da equipa';
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
$fn$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_profile_by_manager(uuid, text, text) TO authenticated;

SELECT 'Parte 3 OK — equipa corrigida, pode criar membros' AS resultado;
