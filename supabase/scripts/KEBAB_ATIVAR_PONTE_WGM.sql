-- =============================================================================
-- KEBAB APP — activar ponte PDV e ligar lojas (correr DEPOIS do script do PDV)
-- =============================================================================
-- ONDE: Supabase do Kebab (projeto kvpssbhclafoymhecmuk)
-- ANTES: corra WGM_PDV_KEBAB_COMPLETO.sql no PDV e copie os IDs das lojas
-- =============================================================================

-- ─── PASSO 1: cole aqui os IDs que o script do PDV mostrou ─────────────────
-- (substitua os zeros pelos valores reais da tabela do PDV)

DO $$
DECLARE
  v_pdv_gandia uuid := '00000000-0000-0000-0000-000000000001';  -- ← ID loja Gandia no PDV
  v_pdv_playa uuid := '00000000-0000-0000-0000-000000000002';   -- ← ID loja Playa no PDV
  v_tid uuid;
BEGIN
  IF v_pdv_gandia = '00000000-0000-0000-0000-000000000001'::uuid
     OR v_pdv_playa = '00000000-0000-0000-0000-000000000002'::uuid THEN
    RAISE EXCEPTION 'Edite este script: substitua v_pdv_gandia e v_pdv_playa pelos IDs reais do PDV (resultado do WGM_PDV_KEBAB_COMPLETO.sql)';
  END IF;

  SELECT id INTO v_tid FROM public.tenants WHERE slug = 'kebab-turco' LIMIT 1;
  IF v_tid IS NULL THEN
    SELECT tenant_id INTO v_tid FROM public.stores LIMIT 1;
  END IF;

  UPDATE public.stores
  SET flow_store_id = v_pdv_gandia, updated_at = now()
  WHERE tenant_id = v_tid
    AND (
      name ILIKE 'Gandia'
      OR name ILIKE '%Gandia%'
    )
    AND name NOT ILIKE '%playa%'
    AND name NOT ILIKE '%Playa%';

  UPDATE public.stores
  SET flow_store_id = v_pdv_playa, updated_at = now()
  WHERE tenant_id = v_tid
    AND (name ILIKE '%playa%' OR name ILIKE '%Playa%');

  RAISE NOTICE 'Lojas do app ligadas ao PDV.';
END $$;

-- ─── PASSO 2: ligar a sincronização ───────────────────────────────────────
INSERT INTO public.wgm_integration_config (id, enabled)
VALUES (1, true)
ON CONFLICT (id) DO UPDATE SET enabled = true, updated_at = now();

-- ─── Confirmação ────────────────────────────────────────────────────────────
SELECT
  s.name AS unidade_app,
  s.flow_store_id AS id_loja_no_pdv,
  s.address AS morada
FROM public.stores s
JOIN public.tenants t ON t.id = s.tenant_id
WHERE t.slug = 'kebab-turco' OR t.slug IS NOT NULL
ORDER BY s.sort_order, s.name;

SELECT enabled AS ponte_activa FROM public.wgm_integration_config WHERE id = 1;
