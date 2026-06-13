-- Correcção de segurança: dados Stripe não expostos a visitantes anónimos.
-- Executar no Supabase → SQL Editor (projecto kvpssbhclafoymhecmuk) se não usar migrations automáticas.

-- Conteúdo idêntico a supabase/migrations/20260613120000_stores_stripe_anon_lockdown.sql

CREATE OR REPLACE VIEW public.stores_public
WITH (security_invoker = true)
AS
SELECT
  id,
  tenant_id,
  name,
  address,
  image_url,
  short_description,
  sort_order,
  created_at,
  is_active,
  latitude,
  longitude,
  geocoded_address
FROM public.stores
WHERE is_active = true;

GRANT SELECT ON public.stores_public TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read active stores" ON public.stores;

REVOKE ALL ON TABLE public.stores FROM anon;

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

-- Verificação (deve devolver false):
SELECT EXISTS (
  SELECT 1
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'stores'
    AND grantee = 'anon'
    AND privilege_type = 'SELECT'
) AS anon_still_reads_stores;  -- esperado: false
