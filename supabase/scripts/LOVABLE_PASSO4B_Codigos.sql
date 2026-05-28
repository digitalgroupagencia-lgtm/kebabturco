-- PASSO 4B — Query NOVA (parte 2 de 3)
-- Códigos de acesso da equipa

CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
  v_can_manage boolean;
BEGIN
  IF _pin IS NULL OR _pin !~ '^(?=.*\d)(?=.*#).{6,10}$' THEN
    RAISE EXCEPTION 'Código deve ter 6–10 caracteres, incluir # e números';
  END IF;

  SELECT ur.store_id, ur.user_id INTO v_store_id, v_user_id
  FROM public.user_roles ur
  WHERE ur.id = _user_role_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Membro da equipe não encontrado';
  END IF;

  v_can_manage := public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = v_store_id
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sem permissão para definir código de acesso';
  END IF;

  IF public.staff_pin_in_use(v_store_id, _pin, _user_role_id) THEN
    RAISE EXCEPTION 'Este código já está em uso nesta loja';
  END IF;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, v_user_id, _user_role_id, extensions.crypt(_pin, extensions.gen_salt('bf')))
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_access_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_staff_access_pin(_store_id uuid, _pin text)
RETURNS TABLE(user_id uuid, role public.app_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
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
GRANT EXECUTE ON FUNCTION public.staff_pin_in_use(uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.lookup_staff_user_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
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

SELECT 'Passo 4B OK' AS status;
