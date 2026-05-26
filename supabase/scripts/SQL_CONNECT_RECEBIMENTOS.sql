-- =============================================================================
-- KEBAB TURCO — Recebimentos Stripe Connect (colar UMA VEZ se o botão falhar por base de dados)
-- =============================================================================

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
  ADD COLUMN IF NOT EXISTS stripe_connect_environment text NOT NULL DEFAULT 'live';

COMMENT ON COLUMN public.stores.stripe_connect_environment IS 'live ou test — ambiente da conta Connect do restaurante';

-- Garantir loja activa para o tenant kebab-turco
UPDATE public.stores s
SET is_active = true, updated_at = now()
FROM public.tenants t
WHERE s.tenant_id = t.id
  AND t.slug = 'kebab-turco'
  AND s.is_active IS NOT TRUE;

-- Se não existir nenhuma loja, criar uma
INSERT INTO public.stores (tenant_id, name, slug, is_active, sort_order)
SELECT t.id, 'Kebab Turco', 'kebab-turco', true, 0
FROM public.tenants t
WHERE t.slug = 'kebab-turco'
  AND NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.tenant_id = t.id AND s.is_active = true
  );

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
