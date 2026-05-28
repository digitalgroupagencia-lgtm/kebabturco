-- Colar na Lovable e Run — corrige codigo de acesso (#) na Lovable

CREATE OR REPLACE FUNCTION public.staff_pin_in_use(_store_id uuid, _pin text, _exclude_role_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_access_pins sap
    WHERE sap.store_id = _store_id
      AND sap.is_active
      AND (_exclude_role_id IS NULL OR sap.user_role_id <> _exclude_role_id)
      AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
BEGIN
  IF _pin IS NULL
     OR length(_pin) < 6
     OR length(_pin) > 10
     OR position('#' in _pin) = 0
     OR _pin !~ '[0-9]' THEN
    RAISE EXCEPTION 'Codigo deve ter 6 a 10 caracteres, incluir # e numeros';
  END IF;

  SELECT ur.store_id, ur.user_id INTO v_store_id, v_user_id
  FROM public.user_roles ur
  WHERE ur.id = _user_role_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Membro da equipe nao encontrado';
  END IF;

  IF NOT public.user_manages_store_team(v_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissao para definir codigo de acesso';
  END IF;

  IF public.staff_pin_in_use(v_store_id, _pin, _user_role_id) THEN
    RAISE EXCEPTION 'Este codigo ja esta em uso nesta loja';
  END IF;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, v_user_id, _user_role_id, extensions.crypt(_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.staff_pin_in_use(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_staff_access_pin(uuid, text) TO authenticated;

SELECT 'Codigo de acesso corrigido' AS passo;
