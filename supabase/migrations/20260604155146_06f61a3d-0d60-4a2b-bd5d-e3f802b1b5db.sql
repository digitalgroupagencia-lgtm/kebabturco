CREATE OR REPLACE FUNCTION public.cleanup_test_orders(
  _store_id uuid DEFAULT NULL,
  _older_than interval DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count bigint;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin_master'::public.app_role);

  IF NOT v_is_admin THEN
    IF _store_id IS NULL THEN
      RAISE EXCEPTION 'store_id obrigatório';
    END IF;
    IF NOT public.user_can_access_store(_store_id) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  WITH d AS (
    DELETE FROM public.orders
    WHERE is_test = true
      AND (_store_id IS NULL OR store_id = _store_id)
      AND (_older_than IS NULL OR created_at < now() - _older_than)
    RETURNING 1
  ) SELECT COUNT(*) INTO v_count FROM d;

  RETURN jsonb_build_object('deleted', v_count);
END;
$function$;