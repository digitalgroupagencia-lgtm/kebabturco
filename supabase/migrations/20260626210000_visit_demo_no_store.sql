-- Demo visita: sem loja oficial; impressão independente das definições da loja

CREATE OR REPLACE FUNCTION public.enqueue_visit_demo_print(
  _ticket_data text,
  _store_id uuid DEFAULT NULL,
  _order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.master_visit_print_config%ROWTYPE;
  v_job_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_cfg FROM public.master_visit_print_config WHERE user_id = auth.uid();
  IF v_cfg.user_id IS NULL OR NULLIF(trim(v_cfg.printer_ip), '') IS NULL THEN
    RAISE EXCEPTION 'Configure a impressora de visita no painel admin';
  END IF;

  -- Não usa printer_settings nem impressão automática da loja — só IP/porta da visita.
  INSERT INTO public.print_jobs (
    store_id, order_id, printer_ip, printer_port, ticket_data, copies, status,
    is_visit_demo, visit_owner_id
  ) VALUES (
    _store_id,
    _order_id,
    trim(v_cfg.printer_ip),
    COALESCE(v_cfg.printer_port, 9100),
    _ticket_data,
    1,
    'pending',
    true,
    auth.uid()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_master_visit_print_config(
  _printer_ip text,
  _printer_port integer DEFAULT 9100,
  _target_store_id uuid DEFAULT NULL,
  _restaurant_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.master_visit_print_config (
    user_id, printer_ip, printer_port, target_store_id, restaurant_display_name, updated_at
  )
  VALUES (
    auth.uid(),
    trim(COALESCE(_printer_ip, '')),
    COALESCE(_printer_port, 9100),
    NULL,
    trim(COALESCE(_restaurant_display_name, '')),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    printer_ip = EXCLUDED.printer_ip,
    printer_port = EXCLUDED.printer_port,
    target_store_id = NULL,
    restaurant_display_name = EXCLUDED.restaurant_display_name,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;
