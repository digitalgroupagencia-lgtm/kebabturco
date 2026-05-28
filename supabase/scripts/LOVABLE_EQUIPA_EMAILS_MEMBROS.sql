-- Colar na Lovable e Run — permite ver o email dos membros da equipa no painel

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

SELECT 'Emails da equipa disponíveis no painel' AS passo;
