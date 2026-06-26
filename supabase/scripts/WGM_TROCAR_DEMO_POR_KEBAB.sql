-- =============================================================================
-- PDV WGM — trocar a empresa de demonstração (Pizzaria do Chef) por Kebab Turco
-- Correr no Supabase do PDV WGM (giqqsqauirokzgraqobh), DEPOIS do WGM_SETUP_NEXUSOPS.sql
-- =============================================================================

DO $$
DECLARE
  v_company_id uuid;
  v_store_gandia uuid;
  v_store_playa uuid;
  v_stores uuid[];
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE nome ILIKE '%pizzaria%chef%'
     OR slug IN ('pizzaria-do-chef', 'pizzaria_do_chef')
  ORDER BY created_at
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada. Crie Kebab Turco pelo botão + Novo Cliente no painel.';
  END IF;

  UPDATE public.companies
  SET
    nome = 'Kebab Turco',
    slug = 'kebab-turco',
    dominio = COALESCE(NULLIF(trim(dominio), ''), 'kebabturco.com'),
    status = 'ativo',
    updated_at = now()
  WHERE id = v_company_id;

  SELECT array_agg(id ORDER BY created_at)
  INTO v_stores
  FROM public.stores
  WHERE company_id = v_company_id;

  IF v_stores IS NULL OR array_length(v_stores, 1) IS NULL THEN
    INSERT INTO public.stores (company_id, nome, endereco, cidade, estado, pais, status)
    VALUES (
      v_company_id,
      'Kebab Turco Gandia',
      'Av. de Beniopa 12, 46701 Gandía (Valencia)',
      'Gandía',
      'Valencia',
      'ES',
      'ativo'
    )
    RETURNING id INTO v_store_gandia;

    INSERT INTO public.stores (company_id, nome, endereco, cidade, estado, pais, status)
    VALUES (
      v_company_id,
      'Kebab Turco Playa Gandia',
      'Playa Gandia, Valencia',
      'Gandía',
      'Valencia',
      'ES',
      'ativo'
    )
    RETURNING id INTO v_store_playa;
  ELSIF array_length(v_stores, 1) = 1 THEN
    v_store_gandia := v_stores[1];
    UPDATE public.stores
    SET
      nome = 'Kebab Turco Gandia',
      endereco = 'Av. de Beniopa 12, 46701 Gandía (Valencia)',
      cidade = 'Gandía',
      estado = 'Valencia',
      pais = 'ES',
      status = 'ativo',
      updated_at = now()
    WHERE id = v_store_gandia;

    INSERT INTO public.stores (company_id, nome, endereco, cidade, estado, pais, status)
    VALUES (
      v_company_id,
      'Kebab Turco Playa Gandia',
      'Playa Gandia, Valencia',
      'Gandía',
      'Valencia',
      'ES',
      'ativo'
    )
    RETURNING id INTO v_store_playa;
  ELSE
    v_store_gandia := v_stores[1];
    v_store_playa := v_stores[2];

    UPDATE public.stores
    SET
      nome = 'Kebab Turco Gandia',
      endereco = 'Av. de Beniopa 12, 46701 Gandía (Valencia)',
      cidade = 'Gandía',
      estado = 'Valencia',
      pais = 'ES',
      status = 'ativo',
      updated_at = now()
    WHERE id = v_store_gandia;

    UPDATE public.stores
    SET
      nome = 'Kebab Turco Playa Gandia',
      endereco = 'Playa Gandia, Valencia',
      cidade = 'Gandía',
      estado = 'Valencia',
      pais = 'ES',
      status = 'ativo',
      updated_at = now()
    WHERE id = v_store_playa;
  END IF;

  UPDATE public.proprioapp_tenant_mappings
  SET
    company_id = v_company_id,
    wgm_store_id = v_store_gandia,
    proprioapp_tenant_slug = 'kebab-turco',
    proprioapp_domain = 'kebabturco.com',
    active = true,
    orders_sync_enabled = true,
    updated_at = now()
  WHERE proprioapp_tenant_slug IN ('kebab-turco', 'pizzaria-do-chef');

  INSERT INTO public.proprioapp_tenant_mappings (
    company_id,
    wgm_store_id,
    proprioapp_tenant_slug,
    proprioapp_domain,
    active,
    menu_sync_enabled,
    orders_sync_enabled,
    stripe_sync_enabled,
    notes
  )
  SELECT
    v_company_id,
    v_store_gandia,
    'kebab-turco',
    'kebabturco.com',
    true,
    true,
    true,
    true,
    'Kebab Turco — app cliente ligada ao PDV'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.proprioapp_tenant_mappings WHERE proprioapp_tenant_slug = 'kebab-turco'
  );

  RAISE NOTICE '=== KEBAB TURCO NO PDV — COPIE OS IDs DAS LOJAS ===';
  RAISE NOTICE 'Empresa: Kebab Turco (id=%)', v_company_id;
  RAISE NOTICE 'Gandia store id=%', v_store_gandia;
  RAISE NOTICE 'Playa store id=%', v_store_playa;
  RAISE NOTICE 'Cole estes IDs no admin Kebab → Unidades → ID da loja no PDV';
END $$;

SELECT
  c.nome AS empresa,
  s.id AS id_loja,
  s.nome AS loja,
  s.endereco AS morada
FROM public.stores s
JOIN public.companies c ON c.id = s.company_id
WHERE c.slug = 'kebab-turco'
ORDER BY s.nome;
