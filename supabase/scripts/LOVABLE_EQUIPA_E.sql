CREATE OR REPLACE FUNCTION public.add_team_member_to_store(
  _user_id uuid,
  _role public.app_role,
  _store_id uuid,
  _tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_role_id uuid;
BEGIN
  IF _user_id IS NULL OR _store_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Dados incompletos';
  END IF;
  IF _role = 'admin_master'::public.app_role THEN
    RAISE EXCEPTION 'Papel invalido';
  END IF;
  IF NOT public.user_manages_store_team(_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissao';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Ja faz parte da equipa';
  END IF;
  INSERT INTO public.user_roles (user_id, role, store_id, tenant_id)
  VALUES (_user_id, _role, _store_id, _tenant_id)
  RETURNING id INTO v_role_id;
  RETURN v_role_id;
END;
$fn$;

SELECT 'E OK' AS passo;
