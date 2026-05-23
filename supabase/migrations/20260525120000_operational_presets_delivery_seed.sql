-- Operational presets (SaaS): platform templates for delivery zones + store bootstrap.
-- No frontend hardcoding — zones live in delivery_zones, templates in operational_preset_*.

-- ---------------------------------------------------------------------------
-- 1) Tenant → preset mapping
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS operational_preset_key text NOT NULL DEFAULT 'generic_restaurant';

CREATE INDEX IF NOT EXISTS idx_tenants_operational_preset_key
  ON public.tenants (operational_preset_key);

-- ---------------------------------------------------------------------------
-- 2) Preset catalog (system + future per-tenant custom presets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operational_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_key text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_presets_key_scope UNIQUE (preset_key, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.operational_preset_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.operational_presets(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_order numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  postal_codes text[] NOT NULL DEFAULT '{}',
  city_names text[] NOT NULL DEFAULT '{}',
  min_distance_km numeric,
  max_distance_km numeric,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_preset_zones_preset
  ON public.operational_preset_zones (preset_id, sort_order);

ALTER TABLE public.operational_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_preset_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read system operational presets" ON public.operational_presets;
CREATE POLICY "Public read system operational presets"
  ON public.operational_presets FOR SELECT
  USING (is_system = true OR tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admin master manage operational presets" ON public.operational_presets;
CREATE POLICY "Admin master manage operational presets"
  ON public.operational_presets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Tenant manage own operational presets" ON public.operational_presets;
CREATE POLICY "Tenant manage own operational presets"
  ON public.operational_presets FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Public read preset zones of visible presets" ON public.operational_preset_zones;
CREATE POLICY "Public read preset zones of visible presets"
  ON public.operational_preset_zones FOR SELECT
  USING (
    preset_id IN (
      SELECT id FROM public.operational_presets
      WHERE is_system = true OR tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admin master manage preset zones" ON public.operational_preset_zones;
CREATE POLICY "Admin master manage preset zones"
  ON public.operational_preset_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));

DROP POLICY IF EXISTS "Tenant manage own preset zones" ON public.operational_preset_zones;
CREATE POLICY "Tenant manage own preset zones"
  ON public.operational_preset_zones FOR ALL TO authenticated
  USING (
    preset_id IN (
      SELECT id FROM public.operational_presets
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    preset_id IN (
      SELECT id FROM public.operational_presets
      WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

DROP TRIGGER IF EXISTS update_operational_presets_updated_at ON public.operational_presets;
CREATE TRIGGER update_operational_presets_updated_at
  BEFORE UPDATE ON public.operational_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3) Seed platform presets
-- ---------------------------------------------------------------------------
INSERT INTO public.operational_presets (preset_key, name, description, is_system, tenant_id)
VALUES
  (
    'generic_restaurant',
    'Restaurante genérico',
    'Uma zona default sem taxa — base mínima para novos clientes.',
    true,
    NULL
  ),
  (
    'kebab_turco_gandia',
    'Kebab Turco Gandia',
    'Gandia entrega grátis (mín. 12€); fora de Gandia +3€ (mín. 18€).',
    true,
    NULL
  )
ON CONFLICT (preset_key, tenant_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    updated_at = now();

-- generic: single fallback zone
INSERT INTO public.operational_preset_zones (
  preset_id, name, min_order, delivery_fee, postal_codes, city_names, is_default, sort_order
)
SELECT p.id, 'Zona default', 0, 0, '{}'::text[], '{}'::text[], true, 0
FROM public.operational_presets p
WHERE p.preset_key = 'generic_restaurant' AND p.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.operational_preset_zones z WHERE z.preset_id = p.id
  );

-- Kebab Turco: Gandia + Fora
INSERT INTO public.operational_preset_zones (
  preset_id, name, min_order, delivery_fee, postal_codes, city_names, is_default, sort_order
)
SELECT p.id, 'Gandia', 12, 0,
  ARRAY['46700', '46701', '46702', '46728']::text[],
  ARRAY['Gandia', 'Gandía', 'Grau de Gandia', 'Grao de Gandia']::text[],
  false, 0
FROM public.operational_presets p
WHERE p.preset_key = 'kebab_turco_gandia' AND p.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.operational_preset_zones z
    WHERE z.preset_id = p.id AND z.name = 'Gandia'
  );

INSERT INTO public.operational_preset_zones (
  preset_id, name, min_order, delivery_fee, postal_codes, city_names, is_default, sort_order
)
SELECT p.id, 'Fora de Gandia', 18, 3,
  '{}'::text[], '{}'::text[],
  true, 1
FROM public.operational_presets p
WHERE p.preset_key = 'kebab_turco_gandia' AND p.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.operational_preset_zones z
    WHERE z.preset_id = p.id AND z.name = 'Fora de Gandia'
  );

-- Kebab Turco tenant uses Gandia preset
UPDATE public.tenants
SET operational_preset_key = 'kebab_turco_gandia'
WHERE slug = 'kebab-turco';

-- ---------------------------------------------------------------------------
-- 4) Apply preset → delivery_zones for a store
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_operational_preset(
  _store_id uuid,
  _preset_key text,
  _replace_existing boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preset_id uuid;
  v_tenant_id uuid;
  v_zone_count integer;
  v_inserted integer := 0;
  v_row record;
BEGIN
  IF _store_id IS NULL OR _preset_key IS NULL OR length(trim(_preset_key)) = 0 THEN
    RAISE EXCEPTION 'store_id and preset_key are required';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.stores WHERE id = _store_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  SELECT id INTO v_preset_id
  FROM public.operational_presets
  WHERE preset_key = _preset_key
    AND (tenant_id IS NULL OR tenant_id = v_tenant_id)
  ORDER BY tenant_id NULLS LAST
  LIMIT 1;

  IF v_preset_id IS NULL THEN
    RAISE EXCEPTION 'Preset not found: %', _preset_key;
  END IF;

  SELECT count(*) INTO v_zone_count FROM public.delivery_zones WHERE store_id = _store_id;

  IF v_zone_count > 0 AND NOT _replace_existing THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'store_already_has_zones',
      'zones_existing', v_zone_count
    );
  END IF;

  IF _replace_existing THEN
    DELETE FROM public.delivery_zones WHERE store_id = _store_id;
  END IF;

  FOR v_row IN
    SELECT *
    FROM public.operational_preset_zones
    WHERE preset_id = v_preset_id AND is_active = true
    ORDER BY sort_order, name
  LOOP
    INSERT INTO public.delivery_zones (
      store_id, name, min_order, delivery_fee,
      postal_codes, city_names,
      min_distance_km, max_distance_km,
      is_default, is_active, sort_order
    ) VALUES (
      _store_id, v_row.name, v_row.min_order, v_row.delivery_fee,
      COALESCE(v_row.postal_codes, '{}'::text[]),
      COALESCE(v_row.city_names, '{}'::text[]),
      v_row.min_distance_km, v_row.max_distance_km,
      v_row.is_default, true, v_row.sort_order
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'skipped', false,
    'preset_key', _preset_key,
    'zones_inserted', v_inserted
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Bootstrap minimal store config on insert (ops + zones from tenant preset)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_store_operations(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_tenant_name text;
  v_preset_key text;
BEGIN
  SELECT s.tenant_id, t.name, COALESCE(t.operational_preset_key, 'generic_restaurant')
  INTO v_tenant_id, v_tenant_name, v_preset_key
  FROM public.stores s
  JOIN public.tenants t ON t.id = s.tenant_id
  WHERE s.id = _store_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.company_settings (store_id, company_name, is_active)
  VALUES (_store_id, v_tenant_name, true)
  ON CONFLICT (store_id) DO NOTHING;

  INSERT INTO public.operations_settings (
    store_id, payment_mode, pay_card_enabled, pay_counter_enabled,
    require_phone_takeaway, avg_prep_minutes, msg_paid, msg_counter
  )
  VALUES (
    _store_id, 'online', true, true,
    true, 12, 'Pago confirmado', 'Pago pendiente en mostrador'
  )
  ON CONFLICT (store_id) DO NOTHING;

  INSERT INTO public.totem_config (
    store_id, primary_language, active_languages,
    enable_dine_in, enable_takeaway, enable_delivery
  )
  VALUES (
    _store_id, 'es', ARRAY['es', 'en']::text[],
    true, true, true
  )
  ON CONFLICT (store_id) DO NOTHING;

  PERFORM public.apply_operational_preset(_store_id, v_preset_key, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_bootstrap_store_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bootstrap_store_operations(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bootstrap_store_operations_on_insert ON public.stores;
CREATE TRIGGER bootstrap_store_operations_on_insert
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bootstrap_store_operations();

-- RPC for admin: import / reset zones from preset
CREATE OR REPLACE FUNCTION public.import_operational_preset(
  _store_id uuid,
  _preset_key text DEFAULT NULL,
  _replace_existing boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_preset_key text;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT s.tenant_id INTO v_tenant_id FROM public.stores s WHERE s.id = _store_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  v_is_admin := public.has_role(v_user_id, 'admin_master'::app_role)
    OR (
      public.has_role(v_user_id, 'restaurant_admin'::app_role)
      AND public.get_user_tenant_id(v_user_id) = v_tenant_id
    );

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF _preset_key IS NOT NULL THEN
    v_preset_key := _preset_key;
  ELSE
    SELECT operational_preset_key INTO v_preset_key FROM public.tenants WHERE id = v_tenant_id;
  END IF;

  RETURN public.apply_operational_preset(_store_id, COALESCE(v_preset_key, 'generic_restaurant'), _replace_existing);
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_operational_preset(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_operational_preset(uuid, text, boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- 6) Backfill Kebab Turco production stores (replace empty / placeholder zones)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_store record;
BEGIN
  FOR v_store IN
    SELECT s.id
    FROM public.stores s
    JOIN public.tenants t ON t.id = s.tenant_id
    WHERE t.operational_preset_key = 'kebab_turco_gandia'
       OR t.slug = 'kebab-turco'
  LOOP
    PERFORM public.apply_operational_preset(v_store.id, 'kebab_turco_gandia', true);
  END LOOP;
END;
$$;

-- Bootstrap any store missing core configs (existing rows, no re-insert zones if present)
DO $$
DECLARE
  v_store_id uuid;
BEGIN
  FOR v_store_id IN SELECT id FROM public.stores LOOP
    PERFORM public.bootstrap_store_operations(v_store_id);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) duplicate_tenant: also copy delivery_zones + enable_delivery
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.duplicate_tenant(
  _source_tenant_id UUID,
  _new_name TEXT,
  _new_slug TEXT,
  _copy_products BOOLEAN DEFAULT true,
  _copy_images BOOLEAN DEFAULT true,
  _copy_banners BOOLEAN DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_tenant_id UUID;
  v_src_store_id UUID;
  v_new_store_id UUID;
  v_src_preset text;
  v_cat RECORD;
  v_new_cat_id UUID;
  v_prod RECORD;
  v_new_prod_id UUID;
  v_count_cat INT := 0;
  v_count_prod INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin_master'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: only admin_master can duplicate tenants';
  END IF;

  SELECT operational_preset_key INTO v_src_preset FROM tenants WHERE id = _source_tenant_id;

  INSERT INTO tenants (name, slug, plan, max_orders_month, is_active, operational_preset_key)
  SELECT _new_name, _new_slug, plan, max_orders_month, true, COALESCE(v_src_preset, 'generic_restaurant')
  FROM tenants WHERE id = _source_tenant_id
  RETURNING id INTO v_new_tenant_id;

  SELECT id INTO v_src_store_id FROM stores WHERE tenant_id = _source_tenant_id ORDER BY created_at LIMIT 1;
  IF v_src_store_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'tenant_id', v_new_tenant_id, 'note', 'Source had no store; new tenant created empty.');
  END IF;

  INSERT INTO stores (tenant_id, name, address, phone, is_active)
  SELECT v_new_tenant_id, name, address, phone, true
  FROM stores WHERE id = v_src_store_id
  RETURNING id INTO v_new_store_id;

  INSERT INTO company_settings (
    store_id, company_name, primary_color, secondary_color, accent_color, cta_color,
    header_color, background_color, text_color, button_style, font_family,
    logo_main_url, logo_secondary_url, logo_language_url, logo_order_type_url,
    logo_main_dark_url, logo_secondary_dark_url, logo_language_dark_url, logo_order_type_dark_url,
    icon_dine_in_url, icon_takeaway_url, banner_home_url, is_active
  )
  SELECT
    v_new_store_id, _new_name, primary_color, secondary_color, accent_color, cta_color,
    header_color, background_color, text_color, button_style, font_family,
    CASE WHEN _copy_images THEN logo_main_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_secondary_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_language_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_order_type_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_main_dark_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_secondary_dark_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_language_dark_url ELSE NULL END,
    CASE WHEN _copy_images THEN logo_order_type_dark_url ELSE NULL END,
    CASE WHEN _copy_images THEN icon_dine_in_url ELSE NULL END,
    CASE WHEN _copy_images THEN icon_takeaway_url ELSE NULL END,
    CASE WHEN _copy_images THEN banner_home_url ELSE NULL END,
    true
  FROM company_settings WHERE store_id = v_src_store_id;

  INSERT INTO operations_settings (
    store_id, payment_mode, pay_card_enabled, pay_cash_enabled, pay_pix_enabled,
    pay_apple_enabled, pay_google_enabled, pay_counter_enabled, pay_link_enabled,
    require_phone_takeaway, avg_prep_minutes, banner_enabled, banner_interval_ms,
    msg_counter, msg_paid
  )
  SELECT
    v_new_store_id, payment_mode, pay_card_enabled, pay_cash_enabled, pay_pix_enabled,
    pay_apple_enabled, pay_google_enabled, pay_counter_enabled, pay_link_enabled,
    require_phone_takeaway, avg_prep_minutes, banner_enabled, banner_interval_ms,
    msg_counter, msg_paid
  FROM operations_settings WHERE store_id = v_src_store_id;

  INSERT INTO totem_config (
    store_id, primary_language, active_languages, language_icons, welcome_message,
    primary_color, secondary_color, accent_color, cta_color,
    logo_url, bg_image_url, enable_dine_in, enable_takeaway, enable_delivery
  )
  SELECT
    v_new_store_id, primary_language, active_languages, language_icons, welcome_message,
    primary_color, secondary_color, accent_color, cta_color,
    CASE WHEN _copy_images THEN logo_url ELSE NULL END,
    CASE WHEN _copy_images THEN bg_image_url ELSE NULL END,
    enable_dine_in, enable_takeaway, enable_delivery
  FROM totem_config WHERE store_id = v_src_store_id;

  INSERT INTO delivery_zones (
    store_id, name, min_order, delivery_fee, postal_codes, city_names,
    min_distance_km, max_distance_km, is_default, is_active, sort_order
  )
  SELECT
    v_new_store_id, name, min_order, delivery_fee, postal_codes, city_names,
    min_distance_km, max_distance_km, is_default, is_active, sort_order
  FROM delivery_zones WHERE store_id = v_src_store_id AND is_active = true;

  IF (SELECT count(*) FROM delivery_zones WHERE store_id = v_new_store_id) = 0 THEN
    PERFORM apply_operational_preset(v_new_store_id, COALESCE(v_src_preset, 'generic_restaurant'), true);
  END IF;

  FOR v_cat IN SELECT * FROM categories WHERE store_id = v_src_store_id LOOP
    INSERT INTO categories (store_id, name, image_url, is_active, sort_order)
    VALUES (
      v_new_store_id, v_cat.name,
      CASE WHEN _copy_images THEN v_cat.image_url ELSE NULL END,
      v_cat.is_active, v_cat.sort_order
    )
    RETURNING id INTO v_new_cat_id;
    v_count_cat := v_count_cat + 1;

    IF _copy_products THEN
      FOR v_prod IN SELECT * FROM products WHERE category_id = v_cat.id LOOP
        INSERT INTO products (store_id, category_id, name, description, price, image_url, is_active, is_bestseller, is_promo, sort_order)
        VALUES (
          v_new_store_id, v_new_cat_id, v_prod.name, v_prod.description, v_prod.price,
          CASE WHEN _copy_images THEN v_prod.image_url ELSE NULL END,
          v_prod.is_active, v_prod.is_bestseller, v_prod.is_promo, v_prod.sort_order
        )
        RETURNING id INTO v_new_prod_id;

        INSERT INTO product_sizes (product_id, name, price_add, sort_order)
        SELECT v_new_prod_id, name, price_add, sort_order FROM product_sizes WHERE product_id = v_prod.id;

        INSERT INTO product_extras (product_id, name, price, max_qty, sort_order)
        SELECT v_new_prod_id, name, price, max_qty, sort_order FROM product_extras WHERE product_id = v_prod.id;

        v_count_prod := v_count_prod + 1;
      END LOOP;
    END IF;
  END LOOP;

  IF _copy_banners THEN
    INSERT INTO promo_banners (store_id, image_url, video_url, media_type, link_url, video_autoplay, video_muted, is_active, sort_order)
    SELECT
      v_new_store_id,
      CASE WHEN _copy_images THEN image_url ELSE NULL END,
      CASE WHEN _copy_images THEN video_url ELSE NULL END,
      media_type, link_url, video_autoplay, video_muted, is_active, sort_order
    FROM promo_banners WHERE store_id = v_src_store_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_new_tenant_id,
    'store_id', v_new_store_id,
    'categories_copied', v_count_cat,
    'products_copied', v_count_prod
  );
END;
$$;
