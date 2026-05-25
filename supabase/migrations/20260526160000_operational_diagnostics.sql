-- Diagnóstico operacional — detecta schema e mesas incompletas

CREATE OR REPLACE FUNCTION public.get_operational_diagnostics(_store_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_qr_token boolean := false;
  v_has_kitchen_print boolean := false;
  v_has_table_validated boolean := false;
  v_tables_missing_token int := 0;
  v_active_tables int := 0;
  v_inactive_tables int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF _store_id IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'admin_master'::app_role)
    OR _store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tables' AND column_name = 'qr_token'
  ) INTO v_has_qr_token;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'kitchen_printed_at'
  ) INTO v_has_kitchen_print;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'table_validated'
  ) INTO v_has_table_validated;

  IF v_has_qr_token AND _store_id IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE is_active AND (qr_token IS NULL OR btrim(qr_token) = '')),
      COUNT(*) FILTER (WHERE is_active),
      COUNT(*) FILTER (WHERE NOT is_active)
    INTO v_tables_missing_token, v_active_tables, v_inactive_tables
    FROM public.tables
    WHERE store_id = _store_id;
  END IF;

  RETURN jsonb_build_object(
    'schema_qr_token', v_has_qr_token,
    'schema_kitchen_print', v_has_kitchen_print,
    'schema_table_validated', v_has_table_validated,
    'rpc_claim_kitchen_print', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'claim_kitchen_print'
    ),
    'rpc_mark_paid_counter', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'mark_order_paid_at_counter'
    ),
    'rpc_regenerate_qr', EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'regenerate_table_qr_token'
    ),
    'rpc_get_diagnostics', true,
    'active_tables', v_active_tables,
    'inactive_tables', v_inactive_tables,
    'tables_missing_qr_token', v_tables_missing_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_operational_diagnostics(uuid) TO authenticated;
