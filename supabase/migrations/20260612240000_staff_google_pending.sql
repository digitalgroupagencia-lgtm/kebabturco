-- Login Google da equipa: pedidos pendentes até o gerente atribuir função ou excluir.

CREATE TABLE IF NOT EXISTS public.staff_google_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  CONSTRAINT staff_google_pending_user_store_unique UNIQUE (user_id, store_id)
);

CREATE INDEX IF NOT EXISTS staff_google_pending_store_status_idx
  ON public.staff_google_pending (store_id, status)
  WHERE status = 'pending';

ALTER TABLE public.staff_google_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers view store google pending"
  ON public.staff_google_pending
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_view_team_at_store(store_id)
  );

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
      AND i.provider = 'google'
  );
$$;

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

CREATE OR REPLACE FUNCTION public.list_staff_google_pending(_store_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF _store_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.user_manages_store_team(_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para ver pedidos Google da equipa';
  END IF;

  RETURN QUERY
  SELECT p.id, p.user_id, p.email, p.full_name, p.created_at
  FROM public.staff_google_pending p
  WHERE p.store_id = _store_id
    AND p.status = 'pending'
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_staff_google_pending(
  _pending_id uuid,
  _role public.app_role,
  _full_name text DEFAULT NULL,
  _preferred_language text DEFAULT 'es'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.staff_google_pending%ROWTYPE;
  v_role_id uuid;
BEGIN
  IF _pending_id IS NULL THEN
    RAISE EXCEPTION 'Pedido inválido';
  END IF;

  IF _role = 'admin_master'::public.app_role THEN
    RAISE EXCEPTION 'Papel inválido para a equipa da loja';
  END IF;

  SELECT * INTO v_row
  FROM public.staff_google_pending
  WHERE id = _pending_id AND status = 'pending'
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já tratado';
  END IF;

  IF NOT public.user_manages_store_team(v_row.store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar este pedido';
  END IF;

  v_role_id := public.add_team_member_to_store(
    v_row.user_id,
    _role,
    v_row.store_id,
    v_row.tenant_id
  );

  PERFORM public.upsert_staff_profile_by_manager(
    v_row.user_id,
    COALESCE(NULLIF(trim(_full_name), ''), v_row.full_name),
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es')
  );

  DELETE FROM public.staff_google_pending WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_role_id', v_role_id,
    'user_id', v_row.user_id,
    'role', _role::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_staff_google_pending(_pending_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.staff_google_pending%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.staff_google_pending
  WHERE id = _pending_id AND status = 'pending'
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado ou já tratado';
  END IF;

  IF NOT public.user_manages_store_team(v_row.store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para excluir este pedido';
  END IF;

  UPDATE public.staff_google_pending
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = v_row.id;

  RETURN jsonb_build_object('success', true, 'user_id', v_row.user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_team_member_to_store(
  _user_id uuid,
  _role public.app_role,
  _store_id uuid,
  _tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF _user_id IS NULL OR _store_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Dados incompletos para adicionar membro';
  END IF;

  IF _role = 'admin_master'::public.app_role THEN
    RAISE EXCEPTION 'Papel inválido para a equipa da loja';
  END IF;

  IF NOT public.user_manages_store_team(_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para adicionar membros a esta loja';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.store_id = _store_id
  ) THEN
    RAISE EXCEPTION 'Esta pessoa já faz parte da equipa desta loja.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, store_id, tenant_id)
  VALUES (_user_id, _role, _store_id, _tenant_id)
  RETURNING id INTO v_role_id;

  DELETE FROM public.staff_google_pending
  WHERE user_id = _user_id AND store_id = _store_id;

  RETURN v_role_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_staff_google_login(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_staff_google_pending(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_staff_google_pending(uuid, public.app_role, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_staff_google_pending(uuid) TO authenticated;
