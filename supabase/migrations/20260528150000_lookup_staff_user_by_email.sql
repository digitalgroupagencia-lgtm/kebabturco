-- Permite ao gerente encontrar utilizador existente ao adicionar membro (fallback sem edge function)

CREATE OR REPLACE FUNCTION public.lookup_staff_user_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_can_manage boolean := false;
BEGIN
  IF _email IS NULL OR length(trim(_email)) < 3 THEN
    RETURN NULL;
  END IF;

  v_can_manage := public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sem permissão para consultar e-mail da equipa';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(_email))
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_staff_user_by_email(text) TO authenticated;
