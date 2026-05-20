
-- Multi-unidades: campos extras em stores para apresentar como cards no totem
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Tipo de pedido "a domicílio"
ALTER TABLE public.totem_config
  ADD COLUMN IF NOT EXISTS enable_delivery BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS icon_delivery_url TEXT;

-- Zonas de entrega (para Kebab: Gandia vs fora)
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  min_order NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  postal_codes TEXT[] DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active delivery_zones"
  ON public.delivery_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Tenant members manage delivery_zones"
  ON public.delivery_zones FOR ALL
  TO authenticated
  USING (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (store_id IN (SELECT s.id FROM stores s WHERE s.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Admin master manage delivery_zones"
  ON public.delivery_zones FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));
