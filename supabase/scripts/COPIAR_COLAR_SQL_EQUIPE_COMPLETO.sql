-- =============================================================================
-- PARTE 2 de 2 — EQUIPE, CÓDIGOS DE ACESSO E ENTREGADORES
-- =============================================================================
-- IMPORTANTE: corra PRIMEIRO o ficheiro COPIAR_COLAR_SQL_EQUIPE_PARTE1_Papeis.sql
-- e só depois este script (Run separado).
--
-- Lovable → Cloud → SQL editor → New query → colar → Run
-- =============================================================================


-- ─── Perfil — idioma preferido ───────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'pt';


-- ─── Pedidos — entregador, hora de saída e código de confirmação ───────────────
-- (o valor out_for_delivery foi adicionado na Parte 1)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES auth.users(id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_confirmation_code text;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver
  ON public.orders(assigned_driver_id)
  WHERE assigned_driver_id IS NOT NULL;


-- ─── BLOCO 4: Tabela de códigos de acesso da equipa ─────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.staff_access_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_access_pins_user_role_unique UNIQUE (user_role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_access_pins_store
  ON public.staff_access_pins(store_id)
  WHERE is_active = true;

ALTER TABLE public.staff_access_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers manage staff pins" ON public.staff_access_pins;
CREATE POLICY "Store managers manage staff pins" ON public.staff_access_pins
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR store_id IN (
    SELECT ur.store_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
      AND ur.store_id IS NOT NULL
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR store_id IN (
    SELECT ur.store_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
      AND ur.store_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Store staff view pin status" ON public.staff_access_pins;
CREATE POLICY "Store staff view pin status" ON public.staff_access_pins
FOR SELECT TO authenticated
USING (
  public.user_can_access_store(auth.uid(), store_id)
);


-- ─── BLOCO 5: Quem pode gerir a equipa (user_roles) ─────────────────────────

DROP POLICY IF EXISTS "Restaurant admin manage store team" ON public.user_roles;
CREATE POLICY "Restaurant admin manage store team" ON public.user_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND store_id IN (
      SELECT ur.store_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
        AND ur.store_id IS NOT NULL
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR (
    store_id IS NOT NULL
    AND store_id IN (
      SELECT ur.store_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
        AND ur.store_id IS NOT NULL
    )
    AND role NOT IN ('admin_master'::public.app_role)
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
    AND store_id IN (
      SELECT ur.store_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.store_id IS NOT NULL
    )
  )
);


-- ─── BLOCO 6: Funções auxiliares ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_can_access_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role = 'admin_master'::public.app_role
        OR ur.store_id = _store_id
        OR (
          ur.tenant_id IS NOT NULL
          AND ur.tenant_id = (SELECT s.tenant_id FROM public.stores s WHERE s.id = _store_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_delivery_driver(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'delivery'::public.app_role
      AND ur.store_id = _store_id
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_pin_in_use(
  _store_id uuid,
  _pin text,
  _exclude_role_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_access_pins sap
    WHERE sap.store_id = _store_id
      AND sap.is_active
      AND (_exclude_role_id IS NULL OR sap.user_role_id <> _exclude_role_id)
      AND sap.pin_hash = crypt(_pin, sap.pin_hash)
  );
$$;


-- ─── BLOCO 7: Guardar código de acesso (com # obrigatório, ex: 250330#) ─────

CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
  v_can_manage boolean;
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

  v_can_manage := public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = v_store_id
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );

  IF NOT v_can_manage THEN
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

GRANT EXECUTE ON FUNCTION public.upsert_staff_access_pin(uuid, text) TO authenticated;


-- ─── BLOCO 8: Validar código no login rápido (5 toques no logótipo) ─────────

CREATE OR REPLACE FUNCTION public.verify_staff_access_pin(_store_id uuid, _pin text)
RETURNS TABLE(user_id uuid, role public.app_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sap.user_id, ur.role
  FROM public.staff_access_pins sap
  JOIN public.user_roles ur ON ur.id = sap.user_role_id
  WHERE sap.store_id = _store_id
    AND sap.is_active
    AND ur.store_id = _store_id
    AND sap.pin_hash = crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_pin_in_use(uuid, text, uuid) TO authenticated;


-- ─── BLOCO 9: Procurar e-mail ao adicionar membro que já existe ──────────────

CREATE OR REPLACE FUNCTION public.lookup_staff_user_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_can_manage boolean := false;
BEGIN
  IF _email IS NULL OR length(trim(_email)) < 3 THEN
    RETURN NULL;
  END IF;

  v_can_manage := public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sem permissão para consultar e-mail da equipa';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(_email))
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_staff_user_by_email(text) TO authenticated;


-- ─── BLOCO 10: Entregadores — listar, atribuir, iniciar e confirmar ───────────

CREATE OR REPLACE FUNCTION public.list_store_drivers(_store_id uuid)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF NOT public.user_can_access_store(auth.uid(), _store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, COALESCE(p.full_name, 'Entregador') AS full_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.store_id = _store_id
    AND ur.role = 'delivery'::public.app_role
  ORDER BY p.full_name NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_store_drivers(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_delivery_driver(
  _order_id uuid,
  _driver_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.user_can_access_store(auth.uid(), v_order.store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF COALESCE(v_order.order_type, '') <> 'delivery' AND v_order.delivery_street IS NULL THEN
    RAISE EXCEPTION 'Pedido não é delivery';
  END IF;
  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para entrega';
  END IF;
  IF NOT public.user_is_delivery_driver(_driver_user_id, v_order.store_id) THEN
    RAISE EXCEPTION 'Utilizador não é entregador desta loja';
  END IF;

  UPDATE public.orders
  SET assigned_driver_id = _driver_user_id, updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'assigned_driver_id', _driver_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_delivery_driver(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_delivery(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  IF v_order.assigned_driver_id IS DISTINCT FROM auth.uid()
     AND NOT public.user_can_access_store(auth.uid(), v_order.store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para sair';
  END IF;

  v_code := v_order.delivery_confirmation_code;
  IF v_code IS NULL OR trim(v_code) = '' THEN
    v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
  END IF;

  UPDATE public.orders
  SET
    status = 'out_for_delivery'::public.order_status,
    delivery_started_at = now(),
    delivery_confirmation_code = v_code,
    assigned_driver_id = COALESCE(assigned_driver_id, auth.uid()),
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'delivery_confirmation_code', v_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_driver_deliveries(_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  order_number text,
  status text,
  total numeric,
  customer_name text,
  customer_phone text,
  delivery_street text,
  delivery_number text,
  delivery_city text,
  delivery_notes text,
  notes text,
  delivery_confirmation_code text,
  delivery_started_at timestamptz,
  estimated_ready_at timestamptz,
  created_at timestamptz,
  assigned_driver_id uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT COALESCE(
    _store_id,
    (SELECT ur.store_id FROM public.user_roles ur
     WHERE ur.user_id = auth.uid() AND ur.role = 'delivery'::public.app_role
     LIMIT 1)
  ) INTO v_store_id;

  IF v_store_id IS NULL THEN RAISE EXCEPTION 'Loja não encontrada'; END IF;
  IF NOT public.user_is_delivery_driver(auth.uid(), v_store_id)
     AND NOT public.user_can_access_store(auth.uid(), v_store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.status::text,
    o.total,
    o.customer_name,
    o.customer_phone,
    o.delivery_street,
    o.delivery_number,
    o.delivery_city,
    o.delivery_notes,
    o.notes,
    o.delivery_confirmation_code,
    o.delivery_started_at,
    o.estimated_ready_at,
    o.created_at,
    o.assigned_driver_id
  FROM public.orders o
  WHERE o.store_id = v_store_id
    AND (o.order_type = 'delivery' OR o.delivery_street IS NOT NULL)
    AND o.status::text IN ('ready', 'out_for_delivery')
    AND o.assigned_driver_id = auth.uid()
    AND o.created_at >= date_trunc('day', now())
  ORDER BY
    CASE o.status::text WHEN 'out_for_delivery' THEN 0 ELSE 1 END,
    o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_deliveries(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_delivery_with_code(
  _order_id uuid,
  _code text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(auth.uid(), v_order.store_id)
    OR v_order.assigned_driver_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para entrega';
  END IF;

  IF v_order.delivery_confirmation_code IS NULL OR trim(v_order.delivery_confirmation_code) = '' THEN
    RAISE EXCEPTION 'Código de entrega não configurado';
  END IF;

  IF trim(_code) <> trim(v_order.delivery_confirmation_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código incorrecto');
  END IF;

  UPDATE public.orders
  SET status = 'delivered'::public.order_status, updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'order_number', v_order.order_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_code(uuid, text) TO authenticated;


-- ─── BLOCO 11: Verificação — deve devolver várias linhas "ok" ────────────────

SELECT 'upsert_staff_access_pin' AS funcao,
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'upsert_staff_access_pin'
       ) AS instalada;

SELECT 'verify_staff_access_pin' AS funcao,
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'verify_staff_access_pin'
       ) AS instalada;

SELECT 'lookup_staff_user_by_email' AS funcao,
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'lookup_staff_user_by_email'
       ) AS instalada;

SELECT 'staff_access_pins (tabela)' AS item,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'staff_access_pins'
       ) AS instalada;

-- Papéis: corra isto numa query SEPARADA se a Parte 1 acabou de ser executada
-- SELECT unnest(enum_range(NULL::public.app_role)) AS papeis_disponiveis;
