-- Corrigir erro "Security Definer View" (stores_public)
-- Copiar TODO este texto para o editor SQL do Lovable e executar.

-- =============================================================================
-- 1) Vista pública das lojas — respeita regras de segurança (sem bypass)
-- =============================================================================
CREATE OR REPLACE VIEW public.stores_public
WITH (security_invoker = true)
AS
SELECT
  id,
  tenant_id,
  name,
  address,
  image_url,
  short_description,
  sort_order,
  created_at,
  is_active
FROM public.stores
WHERE is_active = true;

GRANT SELECT ON public.stores_public TO anon, authenticated;

COMMENT ON VIEW public.stores_public IS
  'Campos públicos das lojas — sem telefone nem Stripe. Totem anónimo.';

-- =============================================================================
-- 2) Anónimos só leem colunas seguras na tabela base (telefone/Stripe bloqueados)
-- =============================================================================
DROP POLICY IF EXISTS "Public can read active stores" ON public.stores;
CREATE POLICY "Public can read active stores"
  ON public.stores FOR SELECT TO anon, authenticated
  USING (is_active = true);

REVOKE ALL ON TABLE public.stores FROM anon;
GRANT SELECT (
  id,
  tenant_id,
  name,
  address,
  image_url,
  short_description,
  sort_order,
  created_at,
  is_active
) ON TABLE public.stores TO anon;
