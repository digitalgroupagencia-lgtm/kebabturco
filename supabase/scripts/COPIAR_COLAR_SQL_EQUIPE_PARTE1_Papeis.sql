-- =============================================================================
-- PARTE 1 de 2 — CORRER PRIMEIRO, SOZINHA, e só depois a Parte 2
-- =============================================================================
-- Lovable → Cloud → SQL editor → New query → colar → Run
--
-- Este erro aparece se misturar Parte 1 + Parte 2 no mesmo Run:
--   "unsafe use of new value manager of enum type app_role"
-- Significa: os papéis novos têm de ser guardados ANTES do resto do script.
-- =============================================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery';

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';

-- Verificação rápida (só listar papéis — corre bem depois do commit acima)
SELECT unnest(enum_range(NULL::public.app_role)) AS papeis_disponiveis;
