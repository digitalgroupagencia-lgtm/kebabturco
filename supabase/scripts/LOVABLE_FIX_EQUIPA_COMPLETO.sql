-- =============================================================================
-- COPIAR TUDO e colar no SQL Editor da Lovable — executar UMA vez
-- Corrige de uma vez: recursão infinita, criar membro, código com # e perfil
-- =============================================================================

-- 1) Funções auxiliares (evitam recursão nas políticas de user_roles)
CREATE OR REPLACE FUNCTION public.user_manages_store_team(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = _store_id
        AND ur.role IN (
          'restaurant_admin'::public.app_role,
          'manager'::public.app_role
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_team_at_store(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(_store_id);
$$;

-- 2) Políticas de user_roles sem recursão
DROP POLICY IF EXISTS "Restaurant admin manage store team" ON public.user_roles;
CREATE POLICY "Restaurant admin manage store team" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND public.user_manages_store_team(store_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND public.user_manages_store_team(store_id)
    AND role <> 'admin_master'::public.app_role
  )
);

DROP POLICY IF EXISTS "Store staff view team" ON public.user_roles;
CREATE POLICY "Store staff view team" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND public.user_can_view_team_at_store(store_id)
  )
);

-- 3) Adicionar membro à loja (RPC usada pela app)
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

  RETURN v_role_id;
END;
$$;

-- 4) Código de acesso com # (6–10 caracteres)
CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
BEGIN
  IF _pin IS NULL OR _pin !~ '^(?=.*\d)(?=.*#).{6,10}$' THEN
    RAISE EXCEPTION 'Código deve ter 6–10 caracteres, incluir # e números';
  END IF;

  SELECT ur.store_id, ur.user_id INTO v_store_id, v_user_id
  FROM public.user_roles ur
  WHERE ur.id = _user_role_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Membro da equipe não encontrado';
  END IF;

  IF NOT public.user_manages_store_team(v_store_id)
     AND NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para definir código de acesso';
  END IF;

  IF public.staff_pin_in_use(v_store_id, _pin, _user_role_id) THEN
    RAISE EXCEPTION 'Este código já está em uso nesta loja';
  END IF;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, v_user_id, _user_role_id, crypt(_pin, gen_salt('bf')))
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$$;

-- 5) Perfil do novo membro (nome + idioma) pelo gerente
CREATE OR REPLACE FUNCTION public.upsert_staff_profile_by_manager(
  _user_id uuid,
  _full_name text DEFAULT NULL,
  _preferred_language text DEFAULT 'es'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador inválido';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur_mgr
       WHERE ur_mgr.user_id = auth.uid()
         AND ur_mgr.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
     ) THEN
    RAISE EXCEPTION 'Sem permissão para actualizar perfil da equipa';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, preferred_language)
  VALUES (
    _user_id,
    NULLIF(trim(_full_name), ''),
    COALESCE(NULLIF(trim(_preferred_language), ''), 'es')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name),
    preferred_language = COALESCE(NULLIF(trim(EXCLUDED.preferred_language), ''), public.profiles.preferred_language),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_manages_store_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_team_at_store(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_team_member_to_store(uuid, public.app_role, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_staff_access_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_staff_profile_by_manager(uuid, text, text) TO authenticated;

SELECT 'Equipa: correção completa aplicada — pode criar membros' AS resultado;
