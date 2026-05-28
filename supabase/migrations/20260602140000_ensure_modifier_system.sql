-- Garantir tabelas de personalização (modifier) no Agile Transfer / Lovable.

CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name jsonb NOT NULL DEFAULT '{}'::jsonb,
  description jsonb DEFAULT '{}'::jsonb,
  group_kind text NOT NULL DEFAULT 'choice',
  selection_mode text NOT NULL DEFAULT 'single',
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  max_qty integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  repeat_per_unit boolean NOT NULL DEFAULT false,
  UNIQUE (product_id, group_id)
);

ALTER TABLE public.modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_group_kind_check;
ALTER TABLE public.modifier_groups
  ADD CONSTRAINT modifier_groups_group_kind_check
  CHECK (group_kind IN ('choice', 'removal', 'extra', 'substitution'));

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_modifier_groups_store ON public.modifier_groups(store_id);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON public.modifier_options(group_id);
CREATE INDEX IF NOT EXISTS idx_product_modifier_groups_product ON public.product_modifier_groups(product_id);

DROP POLICY IF EXISTS "Tenant manage modifier groups" ON public.modifier_groups;
CREATE POLICY "Tenant manage modifier groups"
  ON public.modifier_groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR public.user_can_access_store(store_id)
  );

DROP POLICY IF EXISTS "Public read active modifier groups" ON public.modifier_groups;
CREATE POLICY "Public read active modifier groups"
  ON public.modifier_groups FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active = true)
  );

DROP POLICY IF EXISTS "Tenant manage modifier options" ON public.modifier_options;
CREATE POLICY "Tenant manage modifier options"
  ON public.modifier_options FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
        AND public.user_can_access_store(mg.store_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
        AND public.user_can_access_store(mg.store_id)
    )
  );

DROP POLICY IF EXISTS "Public read active modifier options" ON public.modifier_options;
CREATE POLICY "Public read active modifier options"
  ON public.modifier_options FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      JOIN public.stores s ON s.id = mg.store_id
      WHERE mg.id = group_id AND mg.is_active = true AND s.is_active = true
    )
  );

DROP POLICY IF EXISTS "Tenant manage product modifier groups" ON public.product_modifier_groups;
CREATE POLICY "Tenant manage product modifier groups"
  ON public.product_modifier_groups FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND public.user_can_access_store(p.store_id)
    )
  );

DROP POLICY IF EXISTS "Public read product modifier groups" ON public.product_modifier_groups;
CREATE POLICY "Public read product modifier groups"
  ON public.product_modifier_groups FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_id AND p.is_active = true AND s.is_active = true
    )
  );

DROP TRIGGER IF EXISTS update_modifier_groups_updated_at ON public.modifier_groups;
CREATE TRIGGER update_modifier_groups_updated_at
  BEFORE UPDATE ON public.modifier_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_modifier_options_updated_at ON public.modifier_options;
CREATE TRIGGER update_modifier_options_updated_at
  BEFORE UPDATE ON public.modifier_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
