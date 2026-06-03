CREATE OR REPLACE FUNCTION public.admin_print_jobs_diagnostic(_store_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT jsonb_build_object(
    'by_status', (SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb) FROM (SELECT status, count(*) AS cnt FROM print_jobs WHERE _store_id IS NULL OR store_id = _store_id GROUP BY status) s),
    'oldest_pending', (SELECT to_jsonb(p) FROM (SELECT id, order_id, printer_ip, created_at, error_message FROM print_jobs WHERE status = 'pending' AND (_store_id IS NULL OR store_id = _store_id) ORDER BY created_at ASC LIMIT 1) p),
    'last_failed', (SELECT to_jsonb(p) FROM (SELECT id, order_id, printer_ip, error_message, updated_at FROM print_jobs WHERE status = 'failed' AND (_store_id IS NULL OR store_id = _store_id) ORDER BY updated_at DESC LIMIT 1) p),
    'push_subscribers', (SELECT jsonb_build_object('web', count(*) FILTER (WHERE platform = 'web'), 'android', count(*) FILTER (WHERE platform = 'android'), 'ios', count(*) FILTER (WHERE platform = 'ios')) FROM push_subscriptions WHERE _store_id IS NULL OR store_id = _store_id)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_clear_print_jobs(_store_id uuid DEFAULT NULL, _statuses text[] DEFAULT ARRAY['pending','failed'])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN RAISE EXCEPTION 'unauthorized'; END IF;
  WITH del AS (DELETE FROM print_jobs WHERE status = ANY(_statuses) AND (_store_id IS NULL OR store_id = _store_id) RETURNING 1)
  SELECT count(*) INTO deleted_count FROM del;
  RETURN jsonb_build_object('deleted', deleted_count);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_requeue_print_jobs(_store_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master') THEN RAISE EXCEPTION 'unauthorized'; END IF;
  WITH upd AS (UPDATE print_jobs SET status = 'pending', error_message = NULL, updated_at = now() WHERE status = 'failed' AND (_store_id IS NULL OR store_id = _store_id) RETURNING 1)
  SELECT count(*) INTO updated_count FROM upd;
  RETURN jsonb_build_object('requeued', updated_count);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_print_jobs_diagnostic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_print_jobs(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_requeue_print_jobs(uuid) TO authenticated;