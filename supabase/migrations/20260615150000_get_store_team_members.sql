-- A equipa vê nomes e dados de perfil na lista (RLS de profiles só permitia o próprio utilizador).

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
