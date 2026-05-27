-- Sessão de mesa: vínculo QR até fecho no painel; libertar cliente quando conta fechada

CREATE OR REPLACE FUNCTION public.get_public_table_binding(
  _store_id uuid,
  _qr_token text,
  _known_session_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table public.tables%ROWTYPE;
  v_session public.table_sessions%ROWTYPE;
  v_pending int := 0;
  v_active_orders int := 0;
BEGIN
  IF _store_id IS NULL OR NULLIF(btrim(_qr_token), '') IS NULL THEN
    RETURN jsonb_build_object('active', false, 'reason', 'missing_params');
  END IF;

  SELECT * INTO v_table
  FROM public.tables
  WHERE store_id = _store_id AND qr_token = _qr_token AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('active', false, 'reason', 'invalid_token');
  END IF;

  IF _known_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.table_sessions
      WHERE id = _known_session_id AND store_id = _store_id AND status = 'open'
    ) THEN
      RETURN jsonb_build_object(
        'active', false,
        'reason', 'session_closed',
        'table_number', v_table.number,
        'table_id', v_table.id
      );
    END IF;
  END IF;

  SELECT * INTO v_session
  FROM public.table_sessions
  WHERE store_id = _store_id AND table_number = v_table.number AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'active', false,
      'reason', 'no_open_session',
      'table_number', v_table.number,
      'table_id', v_table.id
    );
  END IF;

  SELECT COUNT(*) INTO v_pending
    FROM public.orders o
    WHERE o.table_session_id = v_session.id
      AND o.payment_status = 'pending'::public.payment_status
      AND o.status != 'cancelled'::public.order_status;

    SELECT COUNT(*) INTO v_active_orders
    FROM public.orders o
    WHERE o.table_session_id = v_session.id
      AND o.status NOT IN ('delivered'::public.order_status, 'cancelled'::public.order_status);
  END IF;

  RETURN jsonb_build_object(
    'active', true,
    'table_number', v_table.number,
    'table_id', v_table.id,
    'session_id', v_session.id,
    'session_status', COALESCE(v_session.status, 'none'),
    'payment_pending', (v_pending > 0),
    'pending_payment_count', v_pending,
    'active_order_count', v_active_orders
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.open_table_session_on_scan_public(
  _store_id uuid,
  _qr_token text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table public.tables%ROWTYPE;
  v_session uuid;
BEGIN
  SELECT * INTO v_table
  FROM public.tables
  WHERE store_id = _store_id AND qr_token = _qr_token AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QR da mesa inválido ou inactivo';
  END IF;

  v_session := public.open_or_get_table_session_public(_store_id, v_table.number, v_table.id);

  RETURN jsonb_build_object(
    'session_id', v_session,
    'table_number', v_table.number,
    'table_id', v_table.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_table_session_unified(
  _session_id uuid,
  _payment_method text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  UPDATE public.table_session_customers
  SET status = 'closed', payment_method = _payment_method, closed_at = now(), closed_by = auth.uid(), updated_at = now()
  WHERE session_id = _session_id AND status = 'active';

  UPDATE public.orders
  SET
    status = CASE WHEN status IN ('pending'::public.order_status, 'preparing'::public.order_status, 'ready'::public.order_status)
             THEN 'delivered'::public.order_status ELSE status END,
    payment_status = 'paid'::public.payment_status,
    payment_method = (
      CASE _payment_method
        WHEN 'card' THEN 'card'::public.payment_method
        WHEN 'cash' THEN 'cash'::public.payment_method
        WHEN 'pix' THEN 'pix'::public.payment_method
        WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
        WHEN 'google_pay' THEN 'google_pay'::public.payment_method
        ELSE payment_method
      END),
    updated_at = now()
  WHERE table_session_id = _session_id AND status != 'cancelled'::public.order_status;

  UPDATE public.table_sessions
  SET status = 'closed', payment_mode = 'unified', payment_method = _payment_method,
      closed_at = now(), closed_by = auth.uid(), updated_at = now()
  WHERE id = _session_id AND status = 'open'
  RETURNING total_amount INTO v_total;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão de mesa não encontrada ou já fechada';
  END IF;

  RETURN jsonb_build_object('success', true, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_table_session_paid(
  _session_id uuid,
  _payment_method text DEFAULT 'cash'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  UPDATE public.orders
  SET payment_status = 'paid'::public.payment_status,
      payment_method = COALESCE(
        CASE _payment_method
          WHEN 'card' THEN 'card'::public.payment_method
          WHEN 'cash' THEN 'cash'::public.payment_method
          WHEN 'pix' THEN 'pix'::public.payment_method
          ELSE NULL
        END,
        payment_method
      ),
      updated_at = now()
  WHERE table_session_id = _session_id
    AND status != 'cancelled'::public.order_status
    AND payment_status = 'pending'::public.payment_status;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'orders_updated', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_table_session_by_table_number(
  _store_id uuid,
  _table_number text,
  _payment_method text DEFAULT 'cash'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session uuid;
BEGIN
  SELECT id INTO v_session
  FROM public.table_sessions
  WHERE store_id = _store_id AND table_number = _table_number AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', true, 'already_closed', true);
  END IF;

  RETURN public.close_table_session_unified(v_session, _payment_method);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_table_binding TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_table_session_on_scan_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_table_session_paid TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_table_session_by_table_number TO authenticated;
