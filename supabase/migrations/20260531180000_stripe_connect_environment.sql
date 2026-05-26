-- Ambiente Stripe Connect por loja (live vs teste)

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stripe_connect_environment text NOT NULL DEFAULT 'live';

COMMENT ON COLUMN public.stores.stripe_connect_environment IS 'live ou test — ambiente da conta Connect do restaurante';
