-- Anti-IDOR: tracking público passa a usar token secreto por pedido.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_order_token text;

UPDATE public.orders
SET customer_order_token = encode(extensions.gen_random_bytes(16), 'hex')
WHERE customer_order_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN customer_order_token SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_customer_order_token_key'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_customer_order_token_key UNIQUE (customer_order_token);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_order_by_customer_token(_customer_order_token text)
RETURNS TABLE(
  id uuid,
  order_number text,
  status text,
  payment_status text,
  total numeric,
  order_type text,
  created_at timestamptz,
  delivery_street text,
  delivery_number text,
  delivery_city text,
  delivery_postal_code text,
  delivery_fee numeric,
  estimated_ready_at timestamptz,
  discount_amount numeric,
  delivery_confirmation_code text,
  assigned_driver_name text,
  delivery_started_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.status::text,
    o.payment_status::text,
    o.total,
    o.order_type,
    o.created_at,
    o.delivery_street,
    o.delivery_number,
    o.delivery_city,
    o.delivery_postal_code,
    o.delivery_fee,
    o.estimated_ready_at,
    o.discount_amount,
    o.delivery_confirmation_code,
    COALESCE(p.full_name, split_part(u.email::text, '@', 1)) AS assigned_driver_name,
    o.delivery_started_at
  FROM public.orders o
  LEFT JOIN auth.users u ON u.id = o.assigned_driver_id
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE o.customer_order_token = trim(_customer_order_token)
  LIMIT 1;
$$;

-- Função antiga por order_id deixa de ser pública para evitar enumeração/IDOR.
REVOKE EXECUTE ON FUNCTION public.get_order_public(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_order_by_customer_token(text) TO anon, authenticated;

