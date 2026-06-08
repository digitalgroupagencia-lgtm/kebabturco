
CREATE OR REPLACE FUNCTION public.admin_create_tenant_basic(
  _name text,
  _slug text,
  _custom_domain text DEFAULT NULL,
  _plan text DEFAULT 'free',
  _primary_language text DEFAULT 'es',
  _city text DEFAULT NULL,
  _country text DEFAULT NULL,
  _create_default_store boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_store_id uuid := NULL;
  v_clean_slug text;
  v_clean_domain text;
  v_clean_name text;
  v_lang text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT public.has_role(v_uid, 'admin_master'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admin_master pode criar tenants';
  END IF;

  v_clean_name := NULLIF(trim(_name), '');
  IF v_clean_name IS NULL THEN
    RAISE EXCEPTION 'Nome do restaurante é obrigatório';
  END IF;

  v_clean_slug := lower(regexp_replace(COALESCE(_slug, ''), '[^a-z0-9-]+', '-', 'g'));
  v_clean_slug := regexp_replace(v_clean_slug, '(^-+|-+$)', '', 'g');
  IF v_clean_slug IS NULL OR length(v_clean_slug) < 2 THEN
    RAISE EXCEPTION 'Slug inválido (mínimo 2 caracteres, apenas a-z, 0-9, -)';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_clean_slug) THEN
    RAISE EXCEPTION 'Slug já em uso: %', v_clean_slug;
  END IF;

  v_clean_domain := NULLIF(lower(trim(regexp_replace(COALESCE(_custom_domain, ''), '^https?://', '', 'i'))), '');
  IF v_clean_domain IS NOT NULL THEN
    v_clean_domain := regexp_replace(v_clean_domain, '/.*$', '');
    IF EXISTS (SELECT 1 FROM public.tenants WHERE lower(custom_domain) = v_clean_domain) THEN
      RAISE EXCEPTION 'Domínio já em uso: %', v_clean_domain;
    END IF;
  END IF;

  v_lang := lower(COALESCE(NULLIF(trim(_primary_language), ''), 'es'));
  IF v_lang NOT IN ('pt','en','es','fr') THEN v_lang := 'es'; END IF;

  INSERT INTO public.tenants (name, slug, custom_domain, plan, is_active, is_template)
  VALUES (v_clean_name, v_clean_slug, v_clean_domain, COALESCE(NULLIF(trim(_plan), ''), 'free'), true, false)
  RETURNING id INTO v_tenant_id;

  IF _create_default_store THEN
    INSERT INTO public.stores (tenant_id, name, address, is_active, sort_order)
    VALUES (
      v_tenant_id,
      v_clean_name,
      NULLIF(trim(concat_ws(', ', NULLIF(trim(_city), ''), NULLIF(trim(_country), ''))), ''),
      true,
      0
    )
    RETURNING id INTO v_store_id;

    INSERT INTO public.company_settings (store_id, company_name)
    VALUES (v_store_id, v_clean_name);

    INSERT INTO public.operations_settings (store_id) VALUES (v_store_id);

    INSERT INTO public.totem_config (store_id, primary_language, active_languages)
    VALUES (v_store_id, v_lang, ARRAY[v_lang]::text[]);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'tenant_slug', v_clean_slug,
    'custom_domain', v_clean_domain,
    'store_id', v_store_id,
    'primary_language', v_lang
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_tenant_basic(text, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_tenant_basic(text, text, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_tenant_basic(text, text, text, text, text, text, text, boolean) TO service_role;
