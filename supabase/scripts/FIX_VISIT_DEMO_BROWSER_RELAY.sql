-- Demo visita: o Mac (browser com sessão admin) pode apanhar jobs da fila
-- quando o pedido é feito no telemóvel. Correr no SQL Editor do Supabase.

CREATE OR REPLACE FUNCTION public.claim_visit_print_jobs(_owner_user_id uuid, _limit integer DEFAULT 5)
RETURNS SETOF public.print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> _owner_user_id
     OR NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  UPDATE public.print_jobs pj
  SET status = 'printing', updated_at = now(), error_message = null
  WHERE pj.id IN (
    SELECT id FROM public.print_jobs
    WHERE is_visit_demo = true
      AND visit_owner_id = _owner_user_id
      AND status = 'pending'
    ORDER BY created_at ASC
    LIMIT GREATEST(_limit, 1)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING pj.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_visit_demo_print_job(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.print_jobs
  SET status = 'printed', updated_at = now(), error_message = null
  WHERE id = _job_id
    AND is_visit_demo = true
    AND visit_owner_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_visit_demo_print_job(_job_id uuid, _error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.print_jobs
  SET
    status = 'failed',
    error_message = left('[visit-bridge] ' || coalesce(_error, 'erro'), 500),
    updated_at = now()
  WHERE id = _job_id
    AND is_visit_demo = true
    AND visit_owner_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_visit_print_jobs(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_visit_demo_print_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_visit_demo_print_job(uuid, text) TO authenticated;
