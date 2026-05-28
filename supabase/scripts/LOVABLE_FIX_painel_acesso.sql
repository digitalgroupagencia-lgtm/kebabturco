-- Corrigir acesso ao painel após Passo 4A (roles não lidos → ecrã preto / loading infinito)
-- Query NOVA → Executar uma vez

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_my_staff_context()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_tenant uuid;
  v_store uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_uid AND role = 'admin_master'::public.app_role
  LIMIT 1;

  IF v_role IS NULL THEN
    SELECT role INTO v_role
    FROM public.user_roles
    WHERE user_id = v_uid
    ORDER BY created_at
    LIMIT 1;
  END IF;

  SELECT tenant_id INTO v_tenant
  FROM public.user_roles
  WHERE user_id = v_uid AND tenant_id IS NOT NULL
  LIMIT 1;

  SELECT store_id INTO v_store
  FROM public.user_roles
  WHERE user_id = v_uid AND store_id IS NOT NULL
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'role', v_role,
    'tenant_id', v_tenant,
    'store_id', v_store
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_staff_context() TO authenticated;

SELECT 'Fix painel OK' AS status;
