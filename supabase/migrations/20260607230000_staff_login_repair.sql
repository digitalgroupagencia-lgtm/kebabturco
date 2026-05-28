-- Repara login da equipa: senha + confirmação de e-mail + identidade em falta.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      _user_id,
      _user_id,
      jsonb_build_object('sub', _user_id::text, 'email', v_email),
      'email',
      _user_id::text,
      timezone('utc'::text, now()),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manager_repair_staff_login(uuid, text) TO authenticated;
