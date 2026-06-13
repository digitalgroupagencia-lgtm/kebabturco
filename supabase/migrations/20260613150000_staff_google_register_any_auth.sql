-- Registar pedidos Google da equipa sem exigir provider google na identidade (Lovable OAuth)

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
