-- Código de confirmação para entregas delivery (validação pelo estafeta)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmation_code text;

COMMENT ON COLUMN public.orders.delivery_confirmation_code IS 'PIN de 4 dígitos para o estafeta confirmar a entrega';

CREATE OR REPLACE FUNCTION public.confirm_delivery_with_code(
  _order_id uuid,
  _code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR v_order.store_id IN (
      SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF COALESCE(v_order.order_type, '') <> 'delivery' AND v_order.delivery_street IS NULL THEN
    RAISE EXCEPTION 'Apenas pedidos delivery requerem código';
  END IF;

  IF v_order.status::text NOT IN ('ready', 'out_for_delivery') THEN
    RAISE EXCEPTION 'Pedido não está pronto para entrega';
  END IF;

  IF v_order.delivery_confirmation_code IS NULL OR trim(v_order.delivery_confirmation_code) = '' THEN
    RAISE EXCEPTION 'Código de entrega não configurado';
  END IF;

  IF trim(_code) <> trim(v_order.delivery_confirmation_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código incorrecto');
  END IF;

  UPDATE public.orders
  SET status = 'delivered'::public.order_status, updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'order_number', v_order.order_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_delivery_with_code(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_order_public(uuid);
CREATE OR REPLACE FUNCTION public.get_order_public(_order_id uuid)
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
  delivery_confirmation_code text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    id,
    order_number,
    status::text,
    payment_status::text,
    total,
    order_type,
    created_at,
    delivery_street,
    delivery_number,
    delivery_city,
    delivery_postal_code,
    delivery_fee,
    estimated_ready_at,
    discount_amount,
    CASE
      WHEN status::text IN ('ready', 'out_for_delivery')
        AND (order_type = 'delivery' OR delivery_street IS NOT NULL)
      THEN delivery_confirmation_code
      ELSE NULL
    END
  FROM public.orders
  WHERE id = _order_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;
