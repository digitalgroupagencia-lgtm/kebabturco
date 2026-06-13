-- Ativa pedidos de login Google da equipa + realtime no painel Equipa
-- Executar no Supabase SQL Editor (produção Kebab Turco)

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

DROP POLICY IF EXISTS "Managers view store google pending" ON public.staff_google_pending;
CREATE POLICY "Managers view store google pending"
  ON public.staff_google_pending
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_view_team_at_store(store_id)
  );

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

GRANT EXECUTE ON FUNCTION public.register_staff_google_login(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_staff_google_pending(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'staff_google_pending'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_google_pending;
  END IF;
END $$;

SELECT 'tabela_ok' AS passo,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_google_pending'
  ) AS existe;

SELECT email, full_name, status, created_at
FROM public.staff_google_pending
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid
ORDER BY created_at DESC
LIMIT 10;
