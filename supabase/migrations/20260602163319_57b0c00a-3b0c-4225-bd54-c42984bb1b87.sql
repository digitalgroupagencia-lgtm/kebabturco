-- Apply pending staff auth helpers and disambiguate create_customer_order overload.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1) Drop the older (25-arg) overload of create_customer_order so PostgREST
--    can resolve a single signature. The full 30-arg version remains.
DROP FUNCTION IF EXISTS public.create_customer_order(
  uuid, text, jsonb, numeric, numeric,
  text, uuid, text, text, text,
  text, text, text, integer,
  text, text, text, text, text, text,
  numeric, uuid, text,
  text, numeric, uuid
);

-- 2) Auto-confirm trigger for staff team users.
CREATE OR REPLACE FUNCTION public.auto_confirm_staff_team_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'staff_team', '') = 'true' THEN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, timezone('utc'::text, now()));
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, timezone('utc'::text, now()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_confirm_staff_team_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_staff_team_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_staff_team_user();

-- 3) Definir senha da equipa
CREATE OR REPLACE FUNCTION public.manager_set_staff_password(_user_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF _user_id IS NULL OR _password IS NULL OR length(trim(_password)) < 8 THEN
    RAISE EXCEPTION 'Senha precisa ter pelo menos 8 caracteres';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role)
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur_target
       WHERE ur_target.user_id = _user_id
         AND ur_target.store_id IS NOT NULL
         AND public.user_manages_store_team(ur_target.store_id)
     ) THEN
    RAISE EXCEPTION 'Sem permissao para alterar senha deste membro';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(trim(_password), extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now())),
    confirmed_at = COALESCE(confirmed_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilizador nao encontrado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manager_set_staff_password(uuid, text) TO authenticated;

-- 4) Criar utilizador auth da equipa
CREATE OR REPLACE FUNCTION public.manager_create_staff_auth_user(
  _email text,
  _password text,
  _full_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(_email));
  v_name text;
BEGIN
  IF v_email IS NULL OR v_email = '' OR length(trim(_password)) < 8 THEN
    RAISE EXCEPTION 'Email e senha invalidos';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role)
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role IN (
           'restaurant_admin'::public.app_role,
           'manager'::public.app_role
         )
     ) THEN
    RAISE EXCEPTION 'Sem permissao para criar utilizador da equipa';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email) THEN
    RAISE EXCEPTION 'Email ja registado';
  END IF;

  v_name := COALESCE(nullif(trim(_full_name), ''), split_part(v_email, '@', 1));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmed_at, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(trim(_password), extensions.gen_salt('bf')),
    timezone('utc'::text, now()), timezone('utc'::text, now()),
    jsonb_build_object('full_name', v_name, 'staff_team', true),
    timezone('utc'::text, now()), timezone('utc'::text, now()),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    timezone('utc'::text, now()), timezone('utc'::text, now()), timezone('utc'::text, now())
  );

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manager_create_staff_auth_user(text, text, text) TO authenticated;

-- 5) Reparar login da equipa
CREATE OR REPLACE FUNCTION public.manager_repair_staff_login(_user_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  IF _user_id IS NULL OR _password IS NULL OR length(trim(_password)) < 8 THEN
    RAISE EXCEPTION 'Senha precisa ter pelo menos 8 caracteres';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role)
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur_target
       WHERE ur_target.user_id = _user_id
         AND ur_target.store_id IS NOT NULL
         AND public.user_manages_store_team(ur_target.store_id)
     ) THEN
    RAISE EXCEPTION 'Sem permissao para alterar senha deste membro';
  END IF;

  SELECT lower(u.email), COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
  INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = _user_id;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Utilizador sem e-mail';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(trim(_password), extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now())),
    confirmed_at = COALESCE(confirmed_at, timezone('utc'::text, now())),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('staff_team', true, 'full_name', COALESCE(raw_user_meta_data ->> 'full_name', v_name)),
    updated_at = timezone('utc'::text, now())
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilizador nao encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = _user_id AND i.provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      _user_id, _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', v_email),
      'email', _user_id::text,
      timezone('utc'::text, now()), timezone('utc'::text, now()), timezone('utc'::text, now())
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manager_repair_staff_login(uuid, text) TO authenticated;

-- 6) Refresh PostgREST schema cache so the new functions become visible.
NOTIFY pgrst, 'reload schema';
