-- Login da equipa só com código — sem precisar identificar a loja antes

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
    AND ur.store_id = sap.store_id
    AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin_any(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_staff_login_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.stores s
  WHERE s.is_active = true
  ORDER BY s.sort_order ASC NULLS LAST, s.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_login_store_id() TO anon, authenticated;
