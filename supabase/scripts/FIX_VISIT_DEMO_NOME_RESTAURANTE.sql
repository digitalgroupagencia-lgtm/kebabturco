-- Corrige erro «restaurant_display_name does not exist» no painel Demo visita.
-- Correr no SQL Editor do Supabase (projeto kvpssbhclafoymhecmuk).

ALTER TABLE public.master_visit_print_config
  ADD COLUMN IF NOT EXISTS restaurant_display_name text NOT NULL DEFAULT '';

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

CREATE OR REPLACE FUNCTION public.get_master_visit_print_config()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.master_visit_print_config%ROWTYPE;
  v_store_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_row FROM public.master_visit_print_config WHERE user_id = auth.uid();

  IF v_row.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', auth.uid(),
      'printer_ip', '',
      'printer_port', 9100,
      'target_store_id', null,
      'restaurant_display_name', '',
      'bridge_last_seen_at', null
    );
  END IF;

  IF v_row.target_store_id IS NOT NULL THEN
    SELECT name INTO v_store_name FROM public.stores WHERE id = v_row.target_store_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_row.user_id,
    'printer_ip', v_row.printer_ip,
    'printer_port', v_row.printer_port,
    'target_store_id', v_row.target_store_id,
    'target_store_name', v_store_name,
    'restaurant_display_name', COALESCE(v_row.restaurant_display_name, ''),
    'bridge_last_seen_at', v_row.bridge_last_seen_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_master_visit_print_config(text, integer, uuid, text) TO authenticated;

SELECT 'ok' AS visit_demo_fix;
