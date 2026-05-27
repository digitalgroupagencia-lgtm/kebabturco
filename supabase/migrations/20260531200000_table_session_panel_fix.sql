-- Corrigir vínculo mesa: ordem de verificação + listagem de contas abertas no painel

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

CREATE OR REPLACE FUNCTION public.list_store_open_table_sessions(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF _store_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.opened_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      ts.id AS session_id,
      ts.table_number,
      ts.table_id,
      ts.opened_at,
      ts.total_amount,
      (SELECT COUNT(*)::int FROM public.orders o
        WHERE o.table_session_id = ts.id AND o.status != 'cancelled'::public.order_status) AS order_count,
      (SELECT COUNT(*)::int FROM public.orders o
        WHERE o.table_session_id = ts.id
          AND o.payment_status = 'pending'::public.payment_status
          AND o.status != 'cancelled'::public.order_status) AS pending_payment_count,
      (SELECT COUNT(*)::int FROM public.orders o
        WHERE o.table_session_id = ts.id
          AND o.status NOT IN ('delivered'::public.order_status, 'cancelled'::public.order_status)) AS active_kitchen_count,
      (SELECT COALESCE(SUM(o.total), 0) FROM public.orders o
        WHERE o.table_session_id = ts.id
          AND o.payment_status = 'pending'::public.payment_status
          AND o.status != 'cancelled'::public.order_status) AS pending_payment_total
    FROM public.table_sessions ts
    WHERE ts.store_id = _store_id AND ts.status = 'open'
  ) x;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_table_binding TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_table_session_on_scan_public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_store_open_table_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_table_session_unified TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_table_session_paid TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_table_session_by_table_number TO authenticated;
