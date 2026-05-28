-- PARTE 2A — Correr PRIMEIRO (query nova), depois a Parte 2B
-- Cria tabelas e funções base. NÃO inclui políticas ainda.

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

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE OR REPLACE FUNCTION public.user_can_access_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        ur.role = 'admin_master'::public.app_role
        OR ur.store_id = _store_id
        OR (
          ur.tenant_id IS NOT NULL
          AND ur.tenant_id = (SELECT s.tenant_id FROM public.stores s WHERE s.id = _store_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_delivery_driver(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'delivery'::public.app_role
      AND ur.store_id = _store_id
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_pin_in_use(
  _store_id uuid,
  _pin text,
  _exclude_role_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_access_pins sap
    WHERE sap.store_id = _store_id
      AND sap.is_active
      AND (_exclude_role_id IS NULL OR sap.user_role_id <> _exclude_role_id)
      AND sap.pin_hash = crypt(_pin, sap.pin_hash)
  );
$$;

SELECT 'Parte 2A concluída — tabela staff_access_pins' AS status,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'staff_access_pins'
       ) AS tabela_criada;
