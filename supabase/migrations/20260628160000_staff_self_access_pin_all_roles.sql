-- Qualquer membro da equipa da loja pode criar o próprio PIN (não só vendedor).

CREATE OR REPLACE FUNCTION public.upsert_my_staff_access_pin(_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_role_id uuid;
  v_store_id uuid;
  v_hash text;
BEGIN
  IF _pin IS NULL OR trim(_pin) !~ '^\d{4,8}$' THEN
    RAISE EXCEPTION 'Código deve ter entre 4 e 8 dígitos';
  END IF;

  SELECT ur.id, ur.store_id
  INTO v_user_role_id, v_store_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.store_id IS NOT NULL
    AND ur.role <> 'admin_master'::public.app_role
  ORDER BY ur.created_at
  LIMIT 1;

  IF v_user_role_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de equipa não encontrado';
  END IF;

  IF public.staff_pin_in_use(v_store_id, trim(_pin), v_user_role_id) THEN
    RAISE EXCEPTION 'Este código já está em uso nesta loja';
  END IF;

  BEGIN
    v_hash := extensions.crypt(trim(_pin), extensions.gen_salt('bf'));
  EXCEPTION
    WHEN undefined_function OR invalid_schema_name THEN
      v_hash := crypt(trim(_pin), gen_salt('bf'));
  END;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, auth.uid(), v_user_role_id, v_hash)
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_staff_access_pin(text) TO authenticated;
