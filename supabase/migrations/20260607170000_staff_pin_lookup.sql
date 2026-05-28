-- Consulta segura do membro pelo código (só devolve dados se o código bater certo).

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.lookup_staff_by_pin(_pin text)
RETURNS TABLE(user_id uuid, role public.app_role, store_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT sap.user_id, ur.role, sap.store_id, au.email::text
  FROM public.staff_access_pins sap
  JOIN public.user_roles ur ON ur.id = sap.user_role_id
  JOIN auth.users au ON au.id = sap.user_id
  WHERE sap.is_active
    AND _pin IS NOT NULL
    AND length(trim(_pin)) >= 6
    AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_staff_by_pin(text) TO anon, authenticated;
