CREATE OR REPLACE FUNCTION public.apply_template_catchup(_target_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _current text;
  _applied_at timestamptz;
BEGIN
  IF _user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado');
  END IF;

  IF NOT public.has_role(_user, 'admin_master'::public.app_role) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apenas admin_master pode aplicar atualizações');
  END IF;

  IF _target_version IS NULL OR _target_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Versão inválida (use formato x.y.z)');
  END IF;

  SELECT version, applied_at INTO _current, _applied_at
  FROM public._template_version
  WHERE id = true;

  IF _current = _target_version THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_up_to_date', true,
      'version', _current,
      'applied_at', _applied_at
    );
  END IF;

  -- UPSERT singleton (id = true sempre)
  INSERT INTO public._template_version (id, version, applied_at)
  VALUES (true, _target_version, now())
  ON CONFLICT (id) DO UPDATE
    SET version = EXCLUDED.version,
        applied_at = EXCLUDED.applied_at;

  INSERT INTO public.template_update_history (
    version, applied_at, project_name, update_type,
    migration_names, notes, requires_apk_rebuild, success, applied_by
  ) VALUES (
    _target_version, now(), 'Master / Self-update', 'banco',
    ARRAY[]::text[],
    format('Catch-up automático via botão Admin Master (de %s para %s)', COALESCE(_current, 'nenhum'), _target_version),
    false, true, _user
  );

  RETURN jsonb_build_object(
    'ok', true,
    'previous_version', _current,
    'new_version', _target_version,
    'applied_at', now()
  );
END;
$function$;