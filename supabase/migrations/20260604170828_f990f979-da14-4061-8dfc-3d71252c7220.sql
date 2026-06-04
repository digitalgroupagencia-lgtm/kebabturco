CREATE OR REPLACE FUNCTION public.cleanup_print_jobs(
  _store_id uuid,
  _statuses text[] DEFAULT NULL,
  _only_tests boolean DEFAULT false,
  _older_than_hours int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int := 0;
BEGIN
  IF NOT public.user_can_access_store(_store_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH del AS (
    DELETE FROM public.print_jobs pj
    WHERE pj.store_id = _store_id
      AND (_statuses IS NULL OR pj.status = ANY(_statuses))
      AND (
        _only_tests = false
        OR EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = pj.order_id AND COALESCE(o.is_test, false) = true
        )
      )
      AND (
        _older_than_hours IS NULL
        OR pj.created_at < (now() - make_interval(hours => _older_than_hours))
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  RETURN jsonb_build_object('deleted', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_print_jobs(uuid, text[], boolean, int)
  TO authenticated, service_role;