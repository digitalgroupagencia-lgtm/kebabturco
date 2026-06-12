-- Kebab Turco Gandia — activar cartão + Bizum + efectivo no totem (correr uma vez no SQL Editor Lovable)

-- 1) Totem pode ler estado dos recebimentos online
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

-- 2) Conta Stripe live do restaurante
UPDATE public.stores
SET
  stripe_connect_account_id = 'acct_1ThGBRCmGR5UPOtp',
  stripe_connect_environment = 'live',
  stripe_connect_test_simulated = false,
  stripe_charges_enabled = true,
  stripe_onboarding_completed = true,
  stripe_payouts_enabled = true,
  stripe_payout_status = 'active',
  stripe_business_name = COALESCE(stripe_business_name, 'Kebab Turco Gandia'),
  updated_at = now()
WHERE id = '22222222-2222-2222-2222-222222222222'::uuid;

-- 3) Bizum ligado nas definições da loja
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS pay_bizum_enabled boolean NOT NULL DEFAULT true;

UPDATE public.operations_settings
SET
  payment_mode = 'mixed',
  pay_card_enabled = true,
  pay_bizum_enabled = true,
  pay_cash_enabled = true,
  pay_cash_dine_in = true,
  pay_cash_takeaway = true,
  pay_cash_delivery = false,
  pay_counter_enabled = false,
  updated_at = now()
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid;

INSERT INTO public.operations_settings (
  store_id,
  payment_mode,
  pay_card_enabled,
  pay_bizum_enabled,
  pay_cash_enabled,
  pay_cash_dine_in,
  pay_cash_takeaway
)
SELECT
  '22222222-2222-2222-2222-222222222222'::uuid,
  'mixed',
  true,
  true,
  true,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.operations_settings
  WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid
);
