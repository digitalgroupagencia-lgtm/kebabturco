-- Vendedor: activar encriptação + funções de PIN (corre uma vez no SQL Editor).
-- Nota: depois de Publish, a app também usa a função edge seller-complete-onboarding.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
    AND ur.role = 'seller'::public.app_role
    AND ur.store_id IS NOT NULL
  ORDER BY ur.created_at
  LIMIT 1;

  IF v_user_role_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de vendedor não encontrado';
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

CREATE OR REPLACE FUNCTION public.has_my_staff_access_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_access_pins sap
    JOIN public.user_roles ur ON ur.id = sap.user_role_id
    WHERE ur.user_id = auth.uid()
      AND sap.is_active
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_my_staff_access_pin() TO authenticated;

SELECT 'Vendedor: base de dados pronta' AS status;
