-- =============================================================================
-- KEBAB APP — activar ponte com o PDV
-- =============================================================================
-- ONDE CORRER: Supabase do KEBAB (Kebab Turco SnapOrder) — NÃO no Flow Operations
-- =============================================================================

-- ─── A) Sempre corre isto primeiro (activa a ponte) ─────────────────────────
INSERT INTO public.wgm_integration_config (id, enabled)
VALUES (1, true)
ON CONFLICT (id) DO UPDATE SET enabled = true, updated_at = now();

-- ─── B) Ligar cada unidade ao PDV ───────────────────────────────────────────
UPDATE public.stores SET flow_store_id = 'a1b2c3d4-1111-1111-1111-111111111111'
WHERE name ILIKE 'Gandia' AND name NOT ILIKE '%playa%';

UPDATE public.stores SET flow_store_id = 'a1b2c3d4-2222-2222-2222-222222222222'
WHERE name ILIKE '%playa%';

-- ─── Confirmação ────────────────────────────────────────────────────────────
SELECT
  s.name AS unidade,
  s.flow_store_id AS id_no_pdv,
  CASE WHEN s.flow_store_id IS NULL THEN 'FALTA LIGAR' ELSE 'OK' END AS estado
FROM public.stores s
ORDER BY s.sort_order, s.name;

SELECT enabled AS ponte_ligada FROM public.wgm_integration_config WHERE id = 1;
