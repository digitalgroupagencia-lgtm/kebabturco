-- =========================================================
-- 1) AI conversations (histórico do assistente)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON public.ai_conversations(user_id, updated_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
ON public.ai_conversations FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON public.ai_messages(conversation_id, created_at);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage messages of own conversations"
ON public.ai_messages FOR ALL TO authenticated
USING (conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()))
WITH CHECK (conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()));

CREATE TRIGGER trg_ai_conv_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) Duplicar tenant
-- =========================================================
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

  -- 1. Cria novo tenant
  INSERT INTO tenants (name, slug, plan, max_orders_month, is_active)
  SELECT _new_name, _new_slug, plan, max_orders_month, true
  FROM tenants WHERE id = _source_tenant_id
  RETURNING id INTO v_new_tenant_id;

  -- 2. Pega primeira store do source
  SELECT id INTO v_src_store_id FROM stores WHERE tenant_id = _source_tenant_id ORDER BY created_at LIMIT 1;
  IF v_src_store_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'tenant_id', v_new_tenant_id, 'note', 'Source had no store; new tenant created empty.');
  END IF;

  -- 3. Cria store nova baseada na original
  INSERT INTO stores (tenant_id, name, address, phone, is_active)
  SELECT v_new_tenant_id, name, address, phone, true
  FROM stores WHERE id = v_src_store_id
  RETURNING id INTO v_new_store_id;

  -- 4. Copia company_settings (identidade visual)
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

  -- 5. Copia operations_settings (fluxo / pagamentos)
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

  -- 6. Copia totem_config
  INSERT INTO totem_config (
    store_id, primary_language, active_languages, language_icons, welcome_message,
    primary_color, secondary_color, accent_color, cta_color,
    logo_url, bg_image_url, enable_dine_in, enable_takeaway
  )
  SELECT
    v_new_store_id, primary_language, active_languages, language_icons, welcome_message,
    primary_color, secondary_color, accent_color, cta_color,
    CASE WHEN _copy_images THEN logo_url ELSE NULL END,
    CASE WHEN _copy_images THEN bg_image_url ELSE NULL END,
    enable_dine_in, enable_takeaway
  FROM totem_config WHERE store_id = v_src_store_id;

  -- 7. Categorias + produtos (opcional)
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
        v_count_prod := v_count_prod + 1;

        -- Copia tamanhos/extras do produto
        INSERT INTO product_sizes (product_id, name, price_add, sort_order)
        SELECT v_new_prod_id, name, price_add, sort_order FROM product_sizes WHERE product_id = v_prod.id;

        INSERT INTO product_extras (product_id, name, price, max_qty, sort_order)
        SELECT v_new_prod_id, name, price, max_qty, sort_order FROM product_extras WHERE product_id = v_prod.id;
      END LOOP;
    END IF;
  END LOOP;

  -- 8. Banners (opcional)
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