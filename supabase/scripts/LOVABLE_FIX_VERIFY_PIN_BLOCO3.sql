-- Colar na Lovable e Run — corrige verificacao do codigo (#) na entrada da equipa

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
    AND ur.store_id = _store_id
    AND sap.pin_hash = extensions.crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin(uuid, text) TO anon, authenticated;

SELECT 'verify_staff_access_pin corrigido' AS passo;
