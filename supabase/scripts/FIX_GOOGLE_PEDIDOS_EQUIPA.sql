-- Corrigir pedidos de login Google da equipa (Lovable OAuth + Supabase)
-- Executar no Supabase SQL Editor do projecto kvpssbhclafoymhecmuk

CREATE OR REPLACE FUNCTION public.user_has_google_identity(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = _user_id
      AND i.provider IN ('google', 'oauth', 'oidc')
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND (
        COALESCE(u.raw_app_meta_data ->> 'provider', '') IN ('google', 'oauth')
        OR COALESCE(u.raw_user_meta_data ->> 'provider', '') = 'google'
        OR COALESCE(u.raw_user_meta_data ->> 'iss', '') ILIKE '%google%'
      )
  );
$$;

-- Recriar register (igual, mas usa a função acima já corrigida)
CREATE OR REPLACE FUNCTION public.register_staff_google_login(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_tenant_id uuid;
  v_role public.app_role;
  v_pending public.staff_google_pending%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida';
  END IF;

  IF _store_id IS NULL THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  IF NOT public.user_has_google_identity(v_uid) THEN
    RAISE EXCEPTION 'Este acesso é só para quem entrou com Google';
  END IF;

  SELECT s.tenant_id INTO v_tenant_id
  FROM public.stores s
  WHERE s.id = _store_id AND s.is_active = true
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada';
  END IF;

  SELECT u.email::text, COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1))
  INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = v_uid;

  UPDATE auth.users
  SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('staff_team', true, 'full_name', COALESCE(v_name, raw_user_meta_data ->> 'full_name')),
    updated_at = timezone('utc'::text, now())
  WHERE id = v_uid;

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_uid AND ur.store_id = _store_id
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'active', 'role', v_role::text);
  END IF;

  SELECT * INTO v_pending
  FROM public.staff_google_pending p
  WHERE p.user_id = v_uid AND p.store_id = _store_id
  LIMIT 1;

  IF v_pending.id IS NOT NULL AND v_pending.status = 'rejected' THEN
    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  INSERT INTO public.staff_google_pending (user_id, store_id, tenant_id, email, full_name, status)
  VALUES (v_uid, _store_id, v_tenant_id, v_email, NULLIF(trim(v_name), ''), 'pending')
  ON CONFLICT (user_id, store_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.staff_google_pending.full_name),
    updated_at = now()
  WHERE public.staff_google_pending.status = 'pending';

  RETURN jsonb_build_object('status', 'pending');
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_google_identity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_staff_google_login(uuid) TO authenticated;

-- Verificação
SELECT 'staff_google_pending' AS check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_google_pending'
  ) AS ok;

SELECT id, email, full_name, status, created_at
FROM public.staff_google_pending
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid
ORDER BY created_at DESC
LIMIT 10;
