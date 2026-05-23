-- Fase 7 — Corrigir alertas restantes do scanner de segurança
-- Copiar TODO este texto para o editor SQL do Lovable (não o nome do ficheiro).

-- =============================================================================
-- 1) Lojas: telefone e Stripe não expostos ao público
-- =============================================================================
DROP POLICY IF EXISTS "Public can read active stores" ON public.stores;

CREATE OR REPLACE VIEW public.stores_public
WITH (security_invoker = false)
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
  'Campos públicos das lojas — sem telefone nem dados Stripe. Totem/app anónimo.';

-- =============================================================================
-- 2) Fila de impressão — fechar canal aberto (NÃO precisa de PC na cozinha)
--    Os pedidos continuam a entrar na fila. Só o programa da cozinha deixa de
--    ouvir em tempo real; isso é para mais tarde, quando tiveres o PC configurado.
-- =============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.print_jobs;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%is not in publication%' THEN
      RAISE;
    END IF;
END $$;

-- =============================================================================
-- 3) Push — garantir registo de notificações no totem
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.register_push_subscription(uuid, uuid, text, text, text, text) TO anon, authenticated;

-- =============================================================================
-- 4) Centrais — tenant pode ler os seus módulos IA e fidelidade
-- =============================================================================
DROP POLICY IF EXISTS "Tenant read own ai modules" ON public.tenant_ai_modules;
CREATE POLICY "Tenant read own ai modules"
  ON public.tenant_ai_modules FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_tenant(tenant_id)
  );

DROP POLICY IF EXISTS "Tenant read own loyalty programs" ON public.tenant_loyalty_programs;
CREATE POLICY "Tenant read own loyalty programs"
  ON public.tenant_loyalty_programs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_tenant(tenant_id)
  );
