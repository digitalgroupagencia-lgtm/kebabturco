-- =============================================================================
-- PDV WGM — KEBAB TURCO COMPLETO (correr UMA vez, tudo junto)
-- =============================================================================
-- ONDE: Supabase do PDV WGM / Flow Operations (projeto giqqsqauirokzgraqobh)
-- NÃO correr no Supabase do Kebab.
--
-- O que faz:
--   1. Troca a demo "Pizzaria do Chef" por Kebab Turco (empresa + 2 lojas reais)
--   2. Cria chave de ligação + webhook para a app
--   3. Corrige a ligação kebab-turco com IDs reais das lojas
--
-- DEPOIS:
--   • Copie WGM_INTEGRATION_API_KEY e WGM_INBOUND_WEBHOOK_SECRET (aparecem em NOTICE)
--   • Cole nos secrets do Lovable do Kebab
--   • Corra o script KEBAB_ATIVAR_PONTE_WGM.sql no Supabase do Kebab
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    RAISE EXCEPTION 'Base errada: falta companies. Use o Supabase do PDV WGM (giqqsqauirokzgraqobh).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
    RAISE EXCEPTION 'Base errada: falta api_keys. Use o Supabase do PDV WGM.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proprioapp_tenant_mappings') THEN
    RAISE EXCEPTION 'Falta proprioapp_tenant_mappings. Faça Publish no Lovable do projeto WGM.';
  END IF;
END $$;

-- ─── 1) Empresa e lojas reais ───────────────────────────────────────────────
DO $$
DECLARE
  v_company_id uuid;
  v_store_gandia uuid;
  v_store_playa uuid;
  v_stores uuid[];
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE slug = 'kebab-turco'
     OR nome ILIKE '%pizzaria%chef%'
     OR slug IN ('pizzaria-do-chef', 'pizzaria_do_chef')
  ORDER BY CASE WHEN slug = 'kebab-turco' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa no PDV. Crie Kebab Turco pelo botão + Novo Cliente.';
  END IF;

  UPDATE public.companies
  SET
    nome = 'Kebab Turco',
    slug = 'kebab-turco',
    dominio = 'kebabturco.com',
    status = 'ativo',
    updated_at = now()
  WHERE id = v_company_id;

  -- Localização Espanha / Euro
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_localization'
  ) THEN
    INSERT INTO public.company_localization (
      company_id, country_code, currency_code, language_code, timezone,
      fiscal_profile_code, formato_data, formato_numero
    )
    VALUES (
      v_company_id, 'ES', 'EUR', 'es-ES', 'Europe/Madrid',
      'ES_VERIFACTU', 'DD/MM/YYYY', 'es-ES'
    )
    ON CONFLICT (company_id) DO UPDATE SET
      country_code = 'ES',
      currency_code = 'EUR',
      language_code = 'es-ES',
      timezone = 'Europe/Madrid',
      fiscal_profile_code = 'ES_VERIFACTU',
      formato_data = 'DD/MM/YYYY',
      formato_numero = 'es-ES',
      updated_at = now();
  END IF;

  SELECT array_agg(id ORDER BY created_at)
  INTO v_stores
  FROM public.stores
  WHERE company_id = v_company_id;

  IF v_stores IS NULL OR array_length(v_stores, 1) IS NULL THEN
    INSERT INTO public.stores (company_id, nome, endereco, cidade, estado, pais, telefone, status)
    VALUES (v_company_id, 'Kebab Turco Gandia', 'Av. de Beniopa 12, 46701 Gandía (Valencia)', 'Gandía', 'Valencia', 'ES', '960 224 516', 'ativo')
    RETURNING id INTO v_store_gandia;

    INSERT INTO public.stores (company_id, nome, endereco, cidade, estado, pais, telefone, status)
    VALUES (v_company_id, 'Kebab Turco Playa Gandia', 'Playa Gandia, Gandía (Valencia)', 'Gandía', 'Valencia', 'ES', '632 399 584', 'ativo')
    RETURNING id INTO v_store_playa;

  ELSIF array_length(v_stores, 1) = 1 THEN
    v_store_gandia := v_stores[1];
    UPDATE public.stores SET
      nome = 'Kebab Turco Gandia',
      endereco = 'Av. de Beniopa 12, 46701 Gandía (Valencia)',
      cidade = 'Gandía', estado = 'Valencia', pais = 'ES',
      telefone = COALESCE(NULLIF(trim(telefone), ''), '960 224 516'),
      status = 'ativo', updated_at = now()
    WHERE id = v_store_gandia;

    INSERT INTO public.stores (company_id, nome, endereco, cidade, estado, pais, telefone, status)
    VALUES (v_company_id, 'Kebab Turco Playa Gandia', 'Playa Gandia, Gandía (Valencia)', 'Gandía', 'Valencia', 'ES', '632 399 584', 'ativo')
    RETURNING id INTO v_store_playa;

  ELSE
    v_store_gandia := v_stores[1];
    v_store_playa := v_stores[2];

    UPDATE public.stores SET
      nome = 'Kebab Turco Gandia',
      endereco = 'Av. de Beniopa 12, 46701 Gandía (Valencia)',
      cidade = 'Gandía', estado = 'Valencia', pais = 'ES',
      telefone = COALESCE(NULLIF(trim(telefone), ''), '960 224 516'),
      status = 'ativo', updated_at = now()
    WHERE id = v_store_gandia;

    UPDATE public.stores SET
      nome = 'Kebab Turco Playa Gandia',
      endereco = 'Playa Gandia, Gandía (Valencia)',
      cidade = 'Gandía', estado = 'Valencia', pais = 'ES',
      telefone = COALESCE(NULLIF(trim(telefone), ''), '632 399 584'),
      status = 'ativo', updated_at = now()
    WHERE id = v_store_playa;
  END IF;

  -- Remove mapping antigo da pizzaria (se existir)
  DELETE FROM public.proprioapp_tenant_mappings
  WHERE proprioapp_tenant_slug = 'pizzaria-do-chef';

  PERFORM set_config('wgm.kebab_company_id', v_company_id::text, false);
  PERFORM set_config('wgm.kebab_store_gandia', v_store_gandia::text, false);
  PERFORM set_config('wgm.kebab_store_playa', v_store_playa::text, false);

  RAISE NOTICE 'Empresa Kebab Turco: %', v_company_id;
  RAISE NOTICE 'Loja Gandia (cole no app): %', v_store_gandia;
  RAISE NOTICE 'Loja Playa (cole no app): %', v_store_playa;
END $$;

-- ─── 2) Chave API + webhook + ligação kebab-turco ─────────────────────────
DO $$
DECLARE
  v_company_id uuid;
  v_store_gandia uuid;
  v_api_key_id uuid;
  v_api_key text;
  v_webhook_secret text;
  v_inbound_url text := 'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/wgm-inbound-webhook';
BEGIN
  v_company_id := current_setting('wgm.kebab_company_id', true)::uuid;
  v_store_gandia := current_setting('wgm.kebab_store_gandia', true)::uuid;

  IF v_company_id IS NULL OR v_store_gandia IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies WHERE slug = 'kebab-turco' LIMIT 1;
    SELECT id INTO v_store_gandia FROM public.stores s
    JOIN public.companies c ON c.id = s.company_id
    WHERE c.slug = 'kebab-turco' AND s.nome ILIKE '%gandia%' AND s.nome NOT ILIKE '%playa%'
    ORDER BY s.created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa kebab-turco não encontrada após passo 1';
  END IF;

  SELECT id, chave INTO v_api_key_id, v_api_key
  FROM public.api_keys
  WHERE company_id = v_company_id AND nome = 'Kebab Turco Bridge' AND ativo = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_api_key_id IS NULL THEN
    v_api_key := 'wg_' || replace(gen_random_uuid()::text, '-', '');
    v_webhook_secret := encode(gen_random_bytes(32), 'hex');

    INSERT INTO public.api_keys (company_id, nome, chave, permissoes, ativo)
    VALUES (
      v_company_id,
      'Kebab Turco Bridge',
      v_api_key,
      ARRAY['read:products', 'read:categories', 'read:orders', 'write:orders'],
      true
    )
    RETURNING id, chave INTO v_api_key_id, v_api_key;
  ELSE
    SELECT webhook_secret INTO v_webhook_secret
    FROM public.proprioapp_webhook_config
    WHERE company_id = v_company_id
    LIMIT 1;

    IF v_webhook_secret IS NULL THEN
      v_webhook_secret := encode(gen_random_bytes(32), 'hex');
    END IF;
  END IF;

  INSERT INTO public.proprioapp_tenant_mappings (
    company_id, wgm_store_id, proprioapp_tenant_slug, proprioapp_domain,
    integration_api_key_id, active, menu_sync_enabled, orders_sync_enabled,
    stripe_sync_enabled, notes
  )
  VALUES (
    v_company_id, v_store_gandia, 'kebab-turco', 'kebabturco.com',
    v_api_key_id, true, true, true, true,
    'Kebab Turco — Gandia + Playa Gandia ligadas à app'
  )
  ON CONFLICT (proprioapp_tenant_slug) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    wgm_store_id = EXCLUDED.wgm_store_id,
    proprioapp_domain = EXCLUDED.proprioapp_domain,
    integration_api_key_id = EXCLUDED.integration_api_key_id,
    active = true,
    menu_sync_enabled = true,
    orders_sync_enabled = true,
    stripe_sync_enabled = true,
    notes = EXCLUDED.notes,
    updated_at = now();

  INSERT INTO public.proprioapp_webhook_config (company_id, webhook_url, webhook_secret, active)
  VALUES (v_company_id, v_inbound_url, v_webhook_secret, true)
  ON CONFLICT (company_id) DO UPDATE SET
    webhook_url = EXCLUDED.webhook_url,
    webhook_secret = COALESCE(NULLIF(proprioapp_webhook_config.webhook_secret, ''), EXCLUDED.webhook_secret),
    active = true,
    updated_at = now();

  RAISE NOTICE '';
  RAISE NOTICE '========== COPIE PARA O LOVABLE DO KEBAB (Secrets) ==========';
  RAISE NOTICE 'WGM_INTEGRATION_API_KEY=%', v_api_key;
  RAISE NOTICE 'WGM_INBOUND_WEBHOOK_SECRET=%', v_webhook_secret;
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Depois corra KEBAB_ATIVAR_PONTE_WGM.sql no Supabase do Kebab';
END $$;

-- ─── 3) Confirmação ─────────────────────────────────────────────────────────
SELECT
  c.nome AS empresa,
  c.slug,
  s.id AS id_loja_pdv,
  s.nome AS loja,
  s.endereco AS morada,
  s.telefone
FROM public.stores s
JOIN public.companies c ON c.id = s.company_id
WHERE c.slug = 'kebab-turco'
ORDER BY s.nome;

SELECT
  proprioapp_tenant_slug AS slug_app,
  active,
  proprioapp_domain AS dominio,
  wgm_store_id AS loja_principal_pdv,
  notes
FROM public.proprioapp_tenant_mappings
WHERE proprioapp_tenant_slug = 'kebab-turco';
