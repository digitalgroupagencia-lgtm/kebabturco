export const MANUAL_STRIPE_DB_SQL = `
-- Kebab Turco, actualização base de dados (idempotente, pode correr várias vezes)

-- Colunas Stripe na loja
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_iban_last4 text,
  ADD COLUMN IF NOT EXISTS stripe_business_name text,
  ADD COLUMN IF NOT EXISTS stripe_payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_last_payout_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_connect_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_connect_environment text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS stripe_connect_test_simulated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stores.stripe_connect_environment IS 'live ou test, ambiente da conta Connect do restaurante';
COMMENT ON COLUMN public.stores.stripe_connect_test_simulated IS 'Recebimentos de teste simulados, sem dinheiro real';

-- Colunas de pagamento nos pedidos
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_to_store_cents integer,
  ADD COLUMN IF NOT EXISTS online_service_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS application_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kitchen_printed_at timestamptz,
  ADD COLUMN IF NOT EXISTS table_validated boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_kitchen_print ON public.orders (store_id, kitchen_printed_at);

-- QR das mesas
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS qr_token text;

UPDATE public.tables SET qr_token = gen_random_uuid()::text WHERE qr_token IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tables' AND column_name = 'qr_token'
  ) THEN
    ALTER TABLE public.tables ALTER COLUMN qr_token SET NOT NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables (qr_token);

-- Políticas de pagamento
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS pay_cash_dine_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pay_cash_takeaway boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_cash_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_prepayment_takeaway boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_prepayment_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS print_pending_dine_in boolean NOT NULL DEFAULT true;

-- Movimentos e repasses
CREATE TABLE IF NOT EXISTS public.store_payment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  entry_type text NOT NULL DEFAULT 'order_payment',
  gross_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  stripe_fee_cents integer NOT NULL DEFAULT 0,
  processing_fee_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL,
  stripe_payment_intent_id text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_payment_ledger_pi
  ON public.store_payment_ledger (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_payment_ledger_store_created
  ON public.store_payment_ledger (store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.store_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  stripe_payout_id text,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  arrival_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_payouts_stripe_id
  ON public.store_payouts (stripe_payout_id)
  WHERE stripe_payout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_payouts_store_created
  ON public.store_payouts (store_id, created_at DESC);

ALTER TABLE public.store_payment_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant read store payment ledger" ON public.store_payment_ledger;
CREATE POLICY "Tenant read store payment ledger"
  ON public.store_payment_ledger FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin_master'::app_role)
  );

DROP POLICY IF EXISTS "Admin master manage store payment ledger" ON public.store_payment_ledger;
CREATE POLICY "Admin master manage store payment ledger"
  ON public.store_payment_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Tenant read store payouts" ON public.store_payouts;
CREATE POLICY "Tenant read store payouts"
  ON public.store_payouts FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin_master'::app_role)
  );

DROP POLICY IF EXISTS "Admin master manage store payouts" ON public.store_payouts;
CREATE POLICY "Admin master manage store payouts"
  ON public.store_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

-- Funções de recebimentos e diagnóstico
CREATE OR REPLACE FUNCTION public.sync_store_stripe_profile(
  _stripe_account_id text,
  _charges_enabled boolean,
  _payouts_enabled boolean,
  _onboarding_completed boolean,
  _business_name text DEFAULT NULL,
  _iban_last4 text DEFAULT NULL,
  _payout_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stores
  SET
    stripe_charges_enabled = COALESCE(_charges_enabled, stripe_charges_enabled),
    stripe_payouts_enabled = COALESCE(_payouts_enabled, stripe_payouts_enabled),
    stripe_onboarding_completed = COALESCE(_onboarding_completed, stripe_onboarding_completed),
    stripe_business_name = COALESCE(_business_name, stripe_business_name),
    stripe_iban_last4 = COALESCE(_iban_last4, stripe_iban_last4),
    stripe_payout_status = COALESCE(_payout_status, stripe_payout_status),
    updated_at = now()
  WHERE stripe_connect_account_id = _stripe_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_store_stripe_profile(text, boolean, boolean, boolean, text, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.record_payment_settlement(
  _stripe_payment_intent_id text,
  _platform_fee_cents integer,
  _stripe_fee_cents integer,
  _processing_fee_cents integer,
  _net_to_store_cents integer,
  _online_service_fee_cents integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_service_fee integer;
  v_restaurant_gross integer;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE stripe_payment_intent_id = _stripe_payment_intent_id
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  v_service_fee := COALESCE(_online_service_fee_cents, _processing_fee_cents, 0);
  v_restaurant_gross := COALESCE(
    _net_to_store_cents,
    ROUND((v_order.subtotal + COALESCE(v_order.delivery_fee, 0) - COALESCE(v_order.discount_amount, 0)) * 100)::integer
  );

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, 'card'::public.payment_method),
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

GRANT EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.claim_kitchen_print(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean := false;
BEGIN
  UPDATE public.orders
  SET kitchen_printed_at = now(), updated_at = now()
  WHERE id = _order_id AND kitchen_printed_at IS NULL
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_kitchen_print(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_order_paid_at_counter(
  _order_id uuid,
  _payment_method text DEFAULT 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_pm public.payment_method;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR v_order.store_id IN (
      SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_order.payment_status = 'paid'::public.payment_status THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', v_order.id);
  END IF;

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method
    ELSE 'cash'::public.payment_method
  END;

  UPDATE public.orders
  SET payment_status = 'paid'::public.payment_status,
      payment_method = COALESCE(payment_method, v_pm),
      updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object('success', true, 'order_id', _order_id, 'order_number', v_order.order_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid_at_counter(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.regenerate_table_qr_token(_table_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tables t
    JOIN public.stores s ON s.id = t.store_id
    WHERE t.id = _table_id
      AND (public.has_role(auth.uid(), 'admin_master'::app_role)
        OR s.tenant_id = public.get_user_tenant_id(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  v_token := gen_random_uuid()::text;
  UPDATE public.tables SET qr_token = v_token, updated_at = now() WHERE id = _table_id;
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_table_qr_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_operational_diagnostics(_store_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_qr_token boolean := false;
  v_has_kitchen_print boolean := false;
  v_has_table_validated boolean := false;
  v_has_stripe_env boolean := false;
  v_has_stripe_sim boolean := false;
  v_tables_missing_token int := 0;
  v_active_tables int := 0;
  v_inactive_tables int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF _store_id IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR _store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tables' AND column_name = 'qr_token'
  ) INTO v_has_qr_token;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'kitchen_printed_at'
  ) INTO v_has_kitchen_print;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'table_validated'
  ) INTO v_has_table_validated;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'stripe_connect_environment'
  ) INTO v_has_stripe_env;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'stripe_connect_test_simulated'
  ) INTO v_has_stripe_sim;

  IF v_has_qr_token AND _store_id IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE is_active AND (qr_token IS NULL OR btrim(qr_token) = '')),
      COUNT(*) FILTER (WHERE is_active),
      COUNT(*) FILTER (WHERE NOT is_active)
    INTO v_tables_missing_token, v_active_tables, v_inactive_tables
    FROM public.tables
    WHERE store_id = _store_id;
  END IF;

  RETURN jsonb_build_object(
    'schema_qr_token', v_has_qr_token,
    'schema_kitchen_print', v_has_kitchen_print,
    'schema_table_validated', v_has_table_validated,
    'schema_stripe_connect_environment', v_has_stripe_env,
    'schema_stripe_connect_test_simulated', v_has_stripe_sim,
    'rpc_claim_kitchen_print', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'claim_kitchen_print'
    ),
    'rpc_mark_paid_counter', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'mark_order_paid_at_counter'
    ),
    'rpc_regenerate_qr', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'regenerate_table_qr_token'
    ),
    'rpc_get_diagnostics', true,
    'active_tables', v_active_tables,
    'inactive_tables', v_inactive_tables,
    'tables_missing_qr_token', v_tables_missing_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_operational_diagnostics(uuid) TO authenticated;

-- Activar recebimentos de teste (um clique no painel, não depende do servidor)
CREATE OR REPLACE FUNCTION public.activate_test_receivables(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_account text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = _store_id
      AND (
        public.has_role(auth.uid(), 'admin_master'::app_role)
        OR s.tenant_id = public.get_user_tenant_id(auth.uid())
      )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT name INTO v_name FROM public.stores WHERE id = _store_id;
  v_account := 'simulated-' || replace(_store_id::text, '-', '');
  v_account := left(v_account, 32);

  UPDATE public.stores
  SET
    stripe_connect_environment = 'test',
    stripe_connect_test_simulated = true,
    stripe_connect_account_id = v_account,
    stripe_charges_enabled = true,
    stripe_onboarding_completed = true,
    stripe_payouts_enabled = true,
    stripe_payout_status = 'active',
    stripe_business_name = COALESCE(v_name, 'Kebab Turco') || ' (teste simulado)',
    stripe_iban_last4 = '0000',
    updated_at = now()
  WHERE id = _store_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account,
    'message', 'Modo teste simulado activo.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_test_receivables(uuid) TO authenticated;

-- Loja Kebab Turco activa
UPDATE public.stores s
SET is_active = true, updated_at = now()
FROM public.tenants t
WHERE s.tenant_id = t.id
  AND t.slug = 'kebab-turco'
  AND s.is_active IS NOT TRUE;

INSERT INTO public.stores (tenant_id, name, is_active)
SELECT t.id, COALESCE(t.name, 'Kebab Turco'), true
FROM public.tenants t
WHERE t.slug = 'kebab-turco'
  AND NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.tenant_id = t.id
  );

-- Totem: leitura pública do estado Stripe + activação Gandia live
CREATE OR REPLACE FUNCTION public.get_store_checkout_stripe_profile(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.stores%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.stores
  WHERE id = _store_id AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'stripe_connect_account_id', v_row.stripe_connect_account_id,
    'stripe_connect_environment', v_row.stripe_connect_environment,
    'stripe_connect_test_simulated', COALESCE(v_row.stripe_connect_test_simulated, false),
    'stripe_charges_enabled', COALESCE(v_row.stripe_charges_enabled, false),
    'stripe_onboarding_completed', COALESCE(v_row.stripe_onboarding_completed, false),
    'stripe_payouts_enabled', COALESCE(v_row.stripe_payouts_enabled, false),
    'stripe_iban_last4', v_row.stripe_iban_last4,
    'stripe_business_name', v_row.stripe_business_name,
    'stripe_payout_status', v_row.stripe_payout_status,
    'stripe_last_payout_at', v_row.stripe_last_payout_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_checkout_stripe_profile(uuid) TO anon, authenticated;

UPDATE public.stores
SET
  stripe_connect_account_id = 'acct_1TlpAkCeaelUf7YU',
  stripe_connect_environment = 'live',
  stripe_connect_test_simulated = false,
  stripe_charges_enabled = true,
  stripe_onboarding_completed = true,
  stripe_payouts_enabled = true,
  stripe_payout_status = 'active',
  stripe_business_name = COALESCE(stripe_business_name, 'Kebab Turco Gandia'),
  updated_at = now()
WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;
`;
