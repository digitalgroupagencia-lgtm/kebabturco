-- =============================================================================
-- WGM PDV (NexusOps) — configurar ligação ao Kebab Turco
-- =============================================================================
-- ATENÇÃO: corre isto APENAS no Supabase do PDV WGM (projeto giqqsqauirokzgraqobh).
-- NÃO corras no Supabase do Kebab — lá já correu o outro script com sucesso.
-- =============================================================================
-- Depois de correr:
-- 1. Copie a API key e o webhook secret mostrados no resultado (NOTICE)
-- 2. No Lovable do Kebab, secrets:
--    WGM_INTEGRATION_API_KEY = (api key)
--    WGM_INBOUND_WEBHOOK_SECRET = (webhook secret)
-- 3. No admin Kebab → Ponte PDV WGM → activar
-- 4. Em Unidades, cole o UUID de cada loja WGM no campo "ID da loja no PDV WGM"
-- =============================================================================

-- Verificar que estamos na base do PDV WGM (não no Kebab)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) THEN
    RAISE EXCEPTION
      'Base de dados errada: falta a tabela companies. '
      'Este script é do PDV WGM (giqqsqauirokzgraqobh). '
      'No Kebab já correu o outro script — abre o Supabase do projeto WGM / Flow Operations.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) THEN
    RAISE EXCEPTION
      'Base de dados errada: falta a tabela api_keys. '
      'Confirma que estás no Supabase do PDV WGM, não no Kebab.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'proprioapp_tenant_mappings'
  ) THEN
    RAISE EXCEPTION
      'Falta a tabela proprioapp_tenant_mappings no PDV. '
      'Faz Publish no Lovable do projeto WGM e volta a tentar.';
  END IF;
END $$;

-- Listar lojas do PDV (funciona com colunas em português ou inglês)
SELECT
  s.id,
  COALESCE(
    NULLIF(to_jsonb(s) ->> 'nome', ''),
    NULLIF(to_jsonb(s) ->> 'name', ''),
    '(sem nome)'
  ) AS loja,
  COALESCE(
    NULLIF(to_jsonb(s) ->> 'endereco', ''),
    NULLIF(to_jsonb(s) ->> 'address', '')
  ) AS morada
FROM public.stores s
ORDER BY 2;

DO $$
DECLARE
  v_company_id uuid;
  v_api_key_id uuid;
  v_api_key text;
  v_webhook_secret text;
  v_inbound_url text := 'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/wgm-inbound-webhook';
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE slug = 'kebab-turco'
  ORDER BY created_at
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada no WGM';
  END IF;

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
  ON CONFLICT (chave) DO NOTHING
  RETURNING id, chave INTO v_api_key_id, v_api_key;

  IF v_api_key_id IS NULL THEN
    SELECT id, chave INTO v_api_key_id, v_api_key
    FROM public.api_keys
    WHERE company_id = v_company_id AND nome = 'Kebab Turco Bridge'
    LIMIT 1;
  END IF;

  INSERT INTO public.proprioapp_tenant_mappings (
    company_id,
    proprioapp_tenant_slug,
    proprioapp_domain,
    integration_api_key_id,
    active,
    menu_sync_enabled,
    orders_sync_enabled,
    stripe_sync_enabled,
    notes
  )
  VALUES (
    v_company_id,
    'kebab-turco',
    'kebabturco.com',
    v_api_key_id,
    true,
    true,
    true,
    true,
    'Ponte Kebab Turco app → WGM PDV'
  )
  ON CONFLICT (proprioapp_tenant_slug) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    integration_api_key_id = EXCLUDED.integration_api_key_id,
    active = true,
    orders_sync_enabled = true,
    updated_at = now();

  INSERT INTO public.proprioapp_webhook_config (company_id, webhook_url, webhook_secret, active)
  VALUES (v_company_id, v_inbound_url, v_webhook_secret, true)
  ON CONFLICT (company_id) DO UPDATE SET
    webhook_url = EXCLUDED.webhook_url,
    webhook_secret = EXCLUDED.webhook_secret,
    active = true,
    updated_at = now();

  RAISE NOTICE '=== KEBAB TURCO BRIDGE — GUARDE ESTES VALORES ===';
  RAISE NOTICE 'WGM_INTEGRATION_API_KEY=%', v_api_key;
  RAISE NOTICE 'WGM_INBOUND_WEBHOOK_SECRET=%', v_webhook_secret;
  RAISE NOTICE 'Webhook URL (já configurado): %', v_inbound_url;
  RAISE NOTICE 'Company ID: %', v_company_id;
END $$;

-- Disparar fila de webhooks WGM → Kebab (opcional, após mudanças de estado no PDV)
-- SELECT net.http_post(
--   url := 'https://giqqsqauirokzgraqobh.supabase.co/functions/v1/proprioapp-webhook-dispatch',
--   headers := '{"Content-Type": "application/json"}'::jsonb,
--   body := '{"limit": 25}'::jsonb
-- );
