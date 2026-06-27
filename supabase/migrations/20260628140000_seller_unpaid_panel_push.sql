-- Vendedor: sem push ao painel nem cozinha até pagamento confirmado.

CREATE OR REPLACE FUNCTION public.order_should_notify_staff_on_panel(p public.orders)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.status = 'cancelled'::public.order_status THEN false
      WHEN p.seller_id IS NOT NULL AND p.payment_status IS DISTINCT FROM 'paid'::public.payment_status THEN false
      WHEN p.payment_status = 'paid'::public.payment_status THEN true
      WHEN p.order_type = 'dine_in' THEN true
      WHEN p.payment_method IN ('card', 'bizum', 'apple_pay', 'google_pay', 'pix') THEN false
      WHEN p.stripe_payment_intent_id IS NOT NULL THEN false
      ELSE true
    END;
$$;
