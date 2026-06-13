-- Corrige leitura de mesas via QR no telemóvel do cliente (anon).
-- A policy antiga fazia EXISTS em public.stores, mas anon não tem SELECT em stores → erro 42501.

DROP POLICY IF EXISTS "Public read active tables" ON public.tables;
CREATE POLICY "Public read active tables" ON public.tables
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- RPCs de vínculo mesa↔QR (idempotente; alinhado com 20260531200000_table_session_panel_fix.sql)
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

  RETURN jsonb_build_object(
    'active', true,
    'table_number', v_table.number,
    'table_id', v_table.id,
    'session_id', v_session.id,
    'session_status', v_session.status,
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

GRANT EXECUTE ON FUNCTION public.get_public_table_binding(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_table_session_on_scan_public(uuid, text) TO anon, authenticated;
