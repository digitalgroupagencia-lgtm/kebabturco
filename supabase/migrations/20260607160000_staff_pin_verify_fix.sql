-- Corrige verificação do código da equipa (compatível com bcrypt da Lovable)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.verify_staff_access_pin(_store_id uuid, _pin text)
RETURNS TABLE(user_id uuid, role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT sap.user_id, ur.role
  FROM public.staff_access_pins sap
  JOIN public.user_roles ur ON ur.id = sap.user_role_id
  WHERE sap.store_id = _store_id
    AND sap.is_active
    AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.verify_staff_access_pin_any(_pin text)
RETURNS TABLE(user_id uuid, role public.app_role, store_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT sap.user_id, ur.role, sap.store_id
  FROM public.staff_access_pins sap
  JOIN public.user_roles ur ON ur.id = sap.user_role_id
  WHERE sap.is_active
    AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin_any(text) TO anon, authenticated;
