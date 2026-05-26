CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
  v_can_manage boolean;
BEGIN
  IF _pin IS NULL OR _pin !~ '^\d{6,8}$' THEN
    RAISE EXCEPTION 'Código deve ter entre 6 e 8 dígitos';
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
  VALUES (v_store_id, v_user_id, _user_role_id, crypt(_pin, gen_salt('bf', 8)))
  ON CONFLICT (user_role_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        is_active = true,
        updated_at = now();
END;
$$;