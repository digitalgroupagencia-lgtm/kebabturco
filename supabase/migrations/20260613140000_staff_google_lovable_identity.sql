-- Aceitar identidade Google via Lovable OAuth (além do provider google puro)

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
