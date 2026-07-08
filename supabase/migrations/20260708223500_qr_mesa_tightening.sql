-- QR mesa tightening:
-- - remove leitura pública directa de public.tables (evita vazar qr_token).
-- - reforça checagem de tenant/loja nas funções de fecho/pagamento de sessão.

DROP POLICY IF EXISTS "Public read active tables" ON public.tables;

-- Mantém leitura apenas para equipa da própria loja.
DROP POLICY IF EXISTS "Staff read tables of own store" ON public.tables;
CREATE POLICY "Staff read tables of own store"
  ON public.tables FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = tables.store_id
    )
  );

CREATE OR REPLACE FUNCTION public.close_table_session_unified(
  _session_id uuid,
  _payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_session_store_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT ts.store_id
    INTO v_session_store_id
  FROM public.table_sessions ts
  WHERE ts.id = _session_id
  LIMIT 1;

  IF v_session_store_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de mesa não encontrada';
  END IF;

  IF NOT public.user_can_access_store(auth.uid(), v_session_store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

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
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_session_store_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT ts.store_id
    INTO v_session_store_id
  FROM public.table_sessions ts
  WHERE ts.id = _session_id
  LIMIT 1;

  IF v_session_store_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de mesa não encontrada';
  END IF;

  IF NOT public.user_can_access_store(auth.uid(), v_session_store_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

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

