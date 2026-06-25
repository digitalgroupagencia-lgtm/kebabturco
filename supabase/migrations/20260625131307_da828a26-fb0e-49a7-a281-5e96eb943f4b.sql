CREATE OR REPLACE FUNCTION public.get_staff_push_secret_status()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT jsonb_build_object(
    'platformSecretConfigured', nullif(trim(coalesce(staff_push_secret, '')), '') IS NOT NULL,
    'platformSecretLength', length(coalesce(staff_push_secret, '')),
    'functionsBaseUrlConfigured', nullif(trim(coalesce(functions_base_url, '')), '') IS NOT NULL
  )
  FROM public.platform_push_config
  WHERE id = 1
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_push_secret_status() TO authenticated, service_role;

UPDATE public.platform_push_config
SET staff_push_secret = 'STAFF_PUSH_INTERNAL_SECRET'
WHERE id = 1
  AND staff_push_secret IS DISTINCT FROM 'STAFF_PUSH_INTERNAL_SECRET';