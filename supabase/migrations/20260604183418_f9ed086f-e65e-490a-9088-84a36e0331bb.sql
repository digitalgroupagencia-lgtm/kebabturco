CREATE OR REPLACE FUNCTION public.admin_clear_print_jobs(
  _store_id uuid DEFAULT NULL,
  _statuses text[] DEFAULT ARRAY['pending','failed']
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH del AS (
    DELETE FROM public.print_jobs
    WHERE status::text = ANY(_statuses)
      AND (_store_id IS NULL OR store_id = _store_id)
    RETURNING 1
  )
  SELECT count(*) INTO deleted_count FROM del;

  RETURN jsonb_build_object('deleted', deleted_count);
END;
$$;

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
      AND (_statuses IS NULL OR pj.status::text = ANY(_statuses))
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

GRANT EXECUTE ON FUNCTION public.admin_clear_print_jobs(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_print_jobs(uuid, text[], boolean, int) TO authenticated, service_role;

UPDATE public._template_version
SET version = '1.1.1',
    codename = 'Kebab Master',
    notes = 'Correção do teste guiado e limpeza da fila de impressão com status enum.',
    applied_at = now();