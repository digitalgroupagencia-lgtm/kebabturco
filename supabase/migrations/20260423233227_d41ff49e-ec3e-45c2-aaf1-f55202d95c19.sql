-- Plano comercial estendido
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS setup_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sellers_included integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_seller_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sellers_allowed integer NOT NULL DEFAULT 1;

-- Mesas
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  number text NOT NULL,
  capacity integer DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, number)
);
CREATE INDEX IF NOT EXISTS idx_tables_store ON public.tables(store_id);

-- Sessão de mesa aberta
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  table_number text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opened_by uuid,
  closed_by uuid,
  payment_mode text DEFAULT 'unified',
  payment_method text,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tsess_store_status ON public.table_sessions(store_id, status);

-- Clientes da mesa
CREATE TABLE IF NOT EXISTS public.table_session_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  payment_method text,
  total_amount numeric NOT NULL DEFAULT 0,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tsc_session ON public.table_session_customers(session_id);
CREATE INDEX IF NOT EXISTS idx_tsc_store_status ON public.table_session_customers(store_id, status);

-- Orders: vincular vendedor / mesa / cliente
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS table_session_id uuid REFERENCES public.table_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS table_customer_id uuid REFERENCES public.table_session_customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_tsess ON public.orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_tcust ON public.orders(table_customer_id);

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.user_roles WHERE user_id = _user_id AND store_id IS NOT NULL LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_seller(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'seller'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.count_active_sellers(_tenant_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.user_roles WHERE tenant_id = _tenant_id AND role = 'seller'::app_role
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_billing(_tenant_id uuid)
RETURNS TABLE(
  monthly_base numeric, sellers_included int, sellers_allowed int, sellers_active int,
  extra_sellers int, extra_seller_price numeric, extra_total numeric, monthly_total numeric,
  setup_fee numeric, currency text, next_due_date date, status text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (
    SELECT * FROM public.tenant_subscriptions WHERE tenant_id = _tenant_id LIMIT 1
  ), c AS (
    SELECT public.count_active_sellers(_tenant_id) AS active
  )
  SELECT
    COALESCE(s.monthly_amount,0),
    COALESCE(s.sellers_included,1),
    COALESCE(s.sellers_allowed, s.sellers_included, 1),
    c.active,
    GREATEST(COALESCE(s.sellers_allowed, s.sellers_included, 1) - COALESCE(s.sellers_included,1), 0),
    COALESCE(s.extra_seller_price,0),
    GREATEST(COALESCE(s.sellers_allowed, s.sellers_included, 1) - COALESCE(s.sellers_included,1), 0) * COALESCE(s.extra_seller_price,0),
    COALESCE(s.monthly_amount,0) + GREATEST(COALESCE(s.sellers_allowed, s.sellers_included, 1) - COALESCE(s.sellers_included,1), 0) * COALESCE(s.extra_seller_price,0),
    COALESCE(s.setup_fee,0),
    COALESCE(s.currency,'BRL'),
    s.next_due_date,
    COALESCE(s.status,'pending')
  FROM s, c
$$;

-- RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_session_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members manage tables" ON public.tables;
CREATE POLICY "Tenant members manage tables" ON public.tables
  FOR ALL TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

DROP POLICY IF EXISTS "Tenant members manage table_sessions" ON public.table_sessions;
CREATE POLICY "Tenant members manage table_sessions" ON public.table_sessions
  FOR ALL TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

DROP POLICY IF EXISTS "Tenant members manage table_session_customers" ON public.table_session_customers;
CREATE POLICY "Tenant members manage table_session_customers" ON public.table_session_customers
  FOR ALL TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

DROP TRIGGER IF EXISTS tables_set_updated ON public.tables;
CREATE TRIGGER tables_set_updated BEFORE UPDATE ON public.tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tsess_set_updated ON public.table_sessions;
CREATE TRIGGER tsess_set_updated BEFORE UPDATE ON public.table_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tsc_set_updated ON public.table_session_customers;
CREATE TRIGGER tsc_set_updated BEFORE UPDATE ON public.table_session_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();