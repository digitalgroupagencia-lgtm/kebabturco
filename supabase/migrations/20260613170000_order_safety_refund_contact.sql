-- Contacto público do restaurante + registo de reembolso

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

COMMENT ON COLUMN public.stores.phone_secondary IS 'Segundo telefone para clientes (balcão/entrega).';
COMMENT ON COLUMN public.stores.whatsapp_phone IS 'WhatsApp do restaurante (só dígitos ou formato livre).';

CREATE OR REPLACE FUNCTION public.get_store_customer_contact(_store_id uuid)
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
    'store_id', v_row.id,
    'name', v_row.name,
    'phone', NULLIF(trim(v_row.phone), ''),
    'phone_secondary', NULLIF(trim(v_row.phone_secondary), ''),
    'whatsapp_phone', NULLIF(trim(COALESCE(v_row.whatsapp_phone, v_row.phone)), '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_customer_contact(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_store_customer_contact(uuid) IS
  'Telefones públicos do restaurante para o cliente contactar em atrasos.';

CREATE OR REPLACE FUNCTION public.record_order_refund(
  _order_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.payment_status = 'refunded'::public.payment_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_refunded', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number
    );
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'refunded'::public.payment_status,
    status = CASE
      WHEN status = 'cancelled'::public.order_status THEN status
      ELSE 'cancelled'::public.order_status
    END,
    notes = CASE
      WHEN _reason IS NOT NULL AND trim(_reason) <> '' THEN
        trim(COALESCE(v_order.notes, '') || CASE WHEN v_order.notes IS NOT NULL AND trim(v_order.notes) <> '' THEN ' | ' ELSE '' END
          || left(_reason, 300))
      ELSE v_order.notes
    END,
    updated_at = now()
  WHERE id = _order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_order_refund(uuid, text) TO service_role;

COMMENT ON FUNCTION public.record_order_refund(uuid, text) IS
  'Marca pedido como reembolsado e cancelado — chamado pelo webhook/edge após Stripe refund.';
