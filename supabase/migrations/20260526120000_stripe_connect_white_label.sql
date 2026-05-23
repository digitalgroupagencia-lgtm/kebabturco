-- Stripe Connect white-label: financial profile, ledger, payouts (SnapOrder SaaS)

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_iban_last4 text,
  ADD COLUMN IF NOT EXISTS stripe_business_name text,
  ADD COLUMN IF NOT EXISTS stripe_payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_last_payout_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_connect_created_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_to_store_cents integer;

COMMENT ON COLUMN public.orders.processing_fee_cents IS 'Single fee shown to restaurant (platform + Stripe pass-through)';
COMMENT ON COLUMN public.orders.platform_fee_cents IS 'Fixed platform fee (typically 100 = €1)';

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

CREATE OR REPLACE FUNCTION public.record_payment_settlement(
  _stripe_payment_intent_id text,
  _platform_fee_cents integer,
  _stripe_fee_cents integer,
  _processing_fee_cents integer,
  _net_to_store_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  UPDATE public.orders
  SET
    payment_status = 'paid'::public.payment_status,
    payment_method = COALESCE(payment_method, 'card'::public.payment_method),
    platform_fee_cents = COALESCE(_platform_fee_cents, 0),
    stripe_fee_cents = COALESCE(_stripe_fee_cents, 0),
    processing_fee_cents = COALESCE(_processing_fee_cents, 0),
    application_fee_cents = COALESCE(_processing_fee_cents, application_fee_cents),
    net_to_store_cents = _net_to_store_cents,
    updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.store_payment_ledger (
    store_id, order_id, entry_type,
    gross_cents, platform_fee_cents, stripe_fee_cents, processing_fee_cents, net_cents,
    stripe_payment_intent_id, description
  )
  VALUES (
    v_order.store_id, v_order.id, 'order_payment',
    ROUND(v_order.total * 100)::integer,
    COALESCE(_platform_fee_cents, 0),
    COALESCE(_stripe_fee_cents, 0),
    COALESCE(_processing_fee_cents, 0),
    COALESCE(_net_to_store_cents, 0),
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

GRANT EXECUTE ON FUNCTION public.record_payment_settlement(text, integer, integer, integer, integer)
  TO service_role;

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
