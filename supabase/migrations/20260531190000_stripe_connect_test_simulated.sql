-- Conta Connect de teste simulada (quando Stripe ainda não activa charges_enabled)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stripe_connect_test_simulated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stores.stripe_connect_test_simulated IS
  'True quando recebimentos de teste foram activados sem onboarding completo na Stripe — sem dinheiro real.';
