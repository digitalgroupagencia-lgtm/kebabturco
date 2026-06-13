-- Bloquear dados Stripe/IBAN na tabela stores para utilizadores anónimos.
-- Clientes usam stores_public (catálogo) + get_store_checkout_stripe_profile (checkout).

-- 1) Vista pública — só campos seguros
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

COMMENT ON VIEW public.stores_public IS
  'Campos públicos das lojas — sem telefone, Stripe nem dados de payout.';

-- 2) Remover política aberta que expõe a tabela base ao anon
DROP POLICY IF EXISTS "Public can read active stores" ON public.stores;

-- 3) Anon não lê a tabela stores (usa stores_public + RPC de checkout)
REVOKE ALL ON TABLE public.stores FROM anon;

-- 4) Checkout: perfil Stripe mínimo via RPC (já usado pelo totem)
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

COMMENT ON FUNCTION public.get_store_checkout_stripe_profile(uuid) IS
  'Perfil Stripe mínimo para checkout do totem — sem expor a tabela stores ao anon.';
