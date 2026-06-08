
-- Seed do catálogo global de gateways de pagamento
INSERT INTO public.payment_gateways (code, name, description, country, supports_refund, supports_webhook, is_globally_enabled)
VALUES
  ('stripe', 'Stripe', 'Cartão online via Stripe Connect (plataforma + lojas conectadas).', 'ES', true, true, true),
  ('redsys', 'Redsys', 'TPV Virtual Redsys (cartão presencial/online com bancos espanhóis).', 'ES', true, true, true),
  ('bizum',  'Bizum',  'Bizum via integração Redsys (paymethod "z").', 'ES', false, true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- Para cada store existente, garantir uma linha disabled por gateway
INSERT INTO public.store_payment_gateways (store_id, gateway_code, status)
SELECT s.id, g.code, 'disabled'
FROM public.stores s
CROSS JOIN public.payment_gateways g
ON CONFLICT (store_id, gateway_code) DO NOTHING;

-- Trigger: ao criar uma store, gerar linhas disabled para todos os gateways do catálogo
CREATE OR REPLACE FUNCTION public.seed_store_payment_gateways()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_payment_gateways (store_id, gateway_code, status)
  SELECT NEW.id, g.code, 'disabled'
  FROM public.payment_gateways g
  ON CONFLICT (store_id, gateway_code) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_store_payment_gateways ON public.stores;
CREATE TRIGGER trg_seed_store_payment_gateways
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.seed_store_payment_gateways();
