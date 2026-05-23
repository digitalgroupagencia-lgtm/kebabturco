-- Fase 4 — Print jobs isolados (bridge usa service role no PC da cozinha)

DROP POLICY IF EXISTS "Anyone can create print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Anyone can read print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Anyone can update print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Tenant members manage print_jobs" ON public.print_jobs;

CREATE POLICY "Tenant members manage print_jobs"
  ON public.print_jobs FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR (store_id IS NOT NULL AND public.user_can_access_store(store_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR (store_id IS NOT NULL AND public.user_can_access_store(store_id))
  );

-- enqueue_print_job (SECURITY DEFINER) continua a criar jobs.
-- Print-bridge: configurar SUPABASE_SERVICE_ROLE_KEY no PC local (bypass RLS).

COMMENT ON TABLE public.print_jobs IS
  'Fila de impressão por loja. Painel: authenticated. Bridge local: service role.';
