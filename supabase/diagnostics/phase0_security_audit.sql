-- =============================================================================
-- FASE 0 — Diagnóstico de segurança multi-tenant (executar manualmente)
-- Lovable Cloud → SQL Editor → Run
-- Não altera dados. Só consulta políticas e funções actuais.
-- =============================================================================

-- 1) Definição actual de get_user_tenant_id
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_user_tenant_id';

-- 2) Políticas sensíveis — customers
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'customers'
ORDER BY policyname;

-- 3) Políticas — push_subscriptions
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
ORDER BY policyname;

-- 4) Políticas — print_jobs (procurar "Anyone can")
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'print_jobs'
ORDER BY policyname;

-- 5) Políticas — coupon_redemptions (esperado: vazio = RLS sem policy)
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'coupon_redemptions'
ORDER BY policyname;

-- 6) Tabelas com RLS activo mas SEM policies
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- 7) Storage — policies dos buckets principais
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND (
    policyname ILIKE '%branding%'
    OR policyname ILIKE '%product%'
    OR policyname ILIKE '%splash%'
    OR policyname ILIKE '%Anyone%'
    OR policyname ILIKE '%Tenant%'
  )
ORDER BY policyname;

-- 8) Roles por utilizador (amostra — substituir email se quiseres)
SELECT ur.user_id, u.email, ur.role, ur.tenant_id, t.slug AS tenant_slug, ur.store_id
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.tenants t ON t.id = ur.tenant_id
ORDER BY u.email NULLS LAST, ur.role;

-- 9) Resumo rápido — políticas públicas perigosas
SELECT tablename, policyname, cmd,
  CASE
    WHEN qual = 'true' OR with_check = 'true' THEN '⚠️ ABERTO'
    WHEN qual ILIKE '%true%' OR with_check ILIKE '%true%' THEN '⚠️ REVISAR'
    ELSE 'ok'
  END AS alerta
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'customers', 'push_subscriptions', 'print_jobs',
    'coupon_redemptions', 'coupons', 'loyalty_accounts'
  )
ORDER BY tablename, policyname;

-- 10) Realtime — print_jobs na publicação
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('print_jobs', 'orders');
