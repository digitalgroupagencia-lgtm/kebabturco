-- =============================================================================
-- LOVABLE: colar no SQL Editor e executar UMA VEZ antes/depois do Publish.
-- Inclui: push após pagamento, webhook Stripe autoridade, login Google equipa.
-- =============================================================================

-- ── 1/3 Push equipa só após pagamento confirmado ─────────────────────────────
CREATE OR REPLACE FUNCTION public.order_should_notify_staff_on_panel(p public.orders)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.status = 'cancelled'::public.order_status THEN false
      WHEN p.payment_status = 'paid'::public.payment_status THEN true
      WHEN p.order_type = 'dine_in'::public.order_type THEN true
      WHEN p.payment_method IN ('card', 'bizum', 'apple_pay', 'google_pay', 'pix') THEN false
      WHEN p.stripe_payment_intent_id IS NOT NULL THEN false
      ELSE true
    END;
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_staff_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending'::public.order_status
       AND public.order_should_notify_staff_on_panel(NEW) THEN
      PERFORM public.dispatch_staff_new_order_push(NEW.store_id, NEW.id, NEW.order_number);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.payment_status IS DISTINCT FROM 'paid'::public.payment_status
       AND NEW.payment_status = 'paid'::public.payment_status
       AND NEW.status = 'pending'::public.order_status
       AND public.order_should_notify_staff_on_panel(NEW) THEN
      PERFORM public.dispatch_staff_new_order_push(NEW.store_id, NEW.id, NEW.order_number);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_staff_push_after_insert ON public.orders;
CREATE TRIGGER orders_staff_push_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_staff_push();

DROP TRIGGER IF EXISTS orders_staff_push_after_update ON public.orders;
CREATE TRIGGER orders_staff_push_after_update
  AFTER UPDATE OF payment_status, status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_staff_push();

-- ── 2/3 Webhook Stripe = fonte de verdade + falhas ───────────────────────────
CREATE OR REPLACE FUNCTION public.record_payment_settlement(
  _stripe_payment_intent_id text,
  _platform_fee_cents integer,
  _stripe_fee_cents integer,
  _processing_fee_cents integer,
  _net_to_store_cents integer,
  _online_service_fee_cents integer DEFAULT NULL,
  _payment_method text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_service_fee integer;
  v_restaurant_gross integer;
  v_pm public.payment_method;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'store_id', v_order.store_id
    );
  END IF;

  v_service_fee := COALESCE(_online_service_fee_cents, _processing_fee_cents, 0);
  v_restaurant_gross := COALESCE(
    _net_to_store_cents,
    ROUND((v_order.subtotal + COALESCE(v_order.delivery_fee, 0) - COALESCE(v_order.discount_amount, 0)) * 100)::integer
  );

  v_pm := CASE lower(trim(COALESCE(_payment_method, '')))
    WHEN 'bizum' THEN 'bizum'::public.payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
    WHEN 'google_pay' THEN 'google_pay'::public.payment_method
    ELSE NULL
  END;

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(v_pm, payment_method, 'card'::public.payment_method),
    platform_fee_cents = COALESCE(_platform_fee_cents, 0),
    stripe_fee_cents = COALESCE(_stripe_fee_cents, 0),
    online_service_fee_cents = v_service_fee,
    processing_fee_cents = v_service_fee,
    application_fee_cents = v_service_fee,
    net_to_store_cents = v_restaurant_gross,
    updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.store_payment_ledger (
    store_id, order_id, entry_type,
    gross_cents, platform_fee_cents, stripe_fee_cents, processing_fee_cents, net_cents,
    stripe_payment_intent_id, description
  )
  VALUES (
    v_order.store_id, v_order.id, 'order_payment',
    v_restaurant_gross,
    COALESCE(_platform_fee_cents, 0),
    COALESCE(_stripe_fee_cents, 0),
    v_service_fee,
    v_restaurant_gross,
    _stripe_payment_intent_id,
    'Pedido #' || v_order.order_number
  )
  ON CONFLICT (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'store_id', v_order.store_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_failure(
  _stripe_payment_intent_id text,
  _failure_code text DEFAULT NULL,
  _failure_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number
    );
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'failed'::public.payment_status,
    notes = CASE
      WHEN _failure_message IS NOT NULL AND trim(_failure_message) <> '' THEN
        trim(COALESCE(v_order.notes, '') || CASE WHEN v_order.notes IS NOT NULL AND trim(v_order.notes) <> '' THEN ' | ' ELSE '' END
          || 'Pagamento falhou: ' || left(_failure_message, 200))
      ELSE v_order.notes
    END,
    updated_at = now()
  WHERE id = v_order.id
    AND payment_status = 'pending'::public.payment_status;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'failure_code', _failure_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_failure(text, text, text) TO service_role;

-- ── 3/3 Login Google equipa + aprovação no painel Equipa ─────────────────────
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

-- ── Verificação (deve devolver 3 linhas OK) ───────────────────────────────────
SELECT 'register_staff_google_login' AS check_name,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'register_staff_google_login'
  ) AS ok
UNION ALL
SELECT 'record_payment_failure',
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'record_payment_failure'
  )
UNION ALL
SELECT 'staff_google_pending_table',
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_google_pending'
  );
