-- PASSO 3 — Query NOVA, depois do Passo 2
-- Cria colunas e tabela de códigos (sem funções ainda)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'pt';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES auth.users(id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_started_at timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_confirmation_code text;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver
  ON public.orders(assigned_driver_id)
  WHERE assigned_driver_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.staff_access_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_access_pins_user_role_unique UNIQUE (user_role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_access_pins_store
  ON public.staff_access_pins(store_id)
  WHERE is_active = true;

SELECT 'Passo 3 OK' AS status,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'staff_access_pins'
       ) AS tabela_criada;
