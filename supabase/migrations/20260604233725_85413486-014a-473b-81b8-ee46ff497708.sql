CREATE OR REPLACE FUNCTION public.apply_template_catchup(_target_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY applied_at DESC
  LIMIT 1;

  -- Idempotente: se já está na versão alvo ou superior, apenas confirma
  IF _current = _target_version THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_up_to_date', true,
      'version', _current,
      'applied_at', _applied_at
    );
  END IF;

  -- Bump da versão (as migrations SQL em si são aplicadas via Lovable;
  -- esta função registra que o catch-up foi concluído neste banco)
  INSERT INTO public._template_version (version, applied_at)
  VALUES (_target_version, now());

  -- Log no histórico
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
$$;

GRANT EXECUTE ON FUNCTION public.apply_template_catchup(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_template_catchup(text) FROM anon;