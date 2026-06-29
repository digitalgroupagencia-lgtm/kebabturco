-- =============================================================================
-- PDV WGM — criar ou mostrar a chave WGM_INTEGRATION_API_KEY
-- Correr no Supabase do Flow Operations (giqqsqauirokzgraqobh)
-- =============================================================================

-- Ver todas as chaves da empresa Kebab Turco
SELECT ak.nome, ak.chave, ak.ativo, co.nome AS empresa
FROM public.api_keys ak
JOIN public.companies co ON co.id = ak.company_id
WHERE co.slug = 'kebab-turco'
ORDER BY ak.created_at DESC;

-- Criar chave se não existir «Kebab Turco Bridge»
DO $$
DECLARE
  v_company_id uuid;
  v_api_key_id uuid;
  v_api_key text;
BEGIN
  SELECT id INTO v_company_id FROM public.companies WHERE slug = 'kebab-turco' LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa kebab-turco não encontrada. Corra WGM_PDV_KEBAB_COMPLETO.sql primeiro.';
  END IF;

  SELECT id, chave INTO v_api_key_id, v_api_key
  FROM public.api_keys
  WHERE company_id = v_company_id AND nome = 'Kebab Turco Bridge' AND ativo = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_api_key_id IS NULL THEN
    v_api_key := 'wg_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.api_keys (company_id, nome, chave, permissoes, ativo)
    VALUES (
      v_company_id,
      'Kebab Turco Bridge',
      v_api_key,
      ARRAY['read:products', 'read:categories', 'read:orders', 'write:orders'],
      true
    )
    RETURNING id, chave INTO v_api_key_id, v_api_key;
  END IF;

  UPDATE public.proprioapp_tenant_mappings
  SET integration_api_key_id = v_api_key_id, updated_at = now()
  WHERE proprioapp_tenant_slug = 'kebab-turco';

  RAISE NOTICE '';
  RAISE NOTICE '========== COLE NO LOVABLE DO KEBAB (Secret) ==========';
  RAISE NOTICE 'WGM_INTEGRATION_API_KEY=%', v_api_key;
  RAISE NOTICE '=======================================================';
END $$;

-- Mostrar de novo na tabela (copiar coluna chave)
SELECT ak.nome, ak.chave
FROM public.api_keys ak
JOIN public.companies co ON co.id = ak.company_id
WHERE co.slug = 'kebab-turco' AND ak.nome = 'Kebab Turco Bridge' AND ak.ativo = true
ORDER BY ak.created_at DESC
LIMIT 1;
