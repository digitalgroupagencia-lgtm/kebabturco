-- Cupões promocionais: entrega grátis, combo (3.º à metade), validação com carrinho

ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS linked_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_type_check
    CHECK (discount_type IN ('percent', 'fixed', 'free_delivery', 'combo_nth'));

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _store_id uuid,
  _code text,
  _subtotal numeric,
  _delivery_fee numeric DEFAULT 0,
  _cart_items jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric := 0;
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_unit numeric;
  v_total_qty integer := 0;
  v_min_items integer;
  v_nth_pct numeric;
  v_cheapest_unit numeric;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons
  WHERE store_id = _store_id
    AND upper(trim(code)) = upper(trim(_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón no válido');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón expirado');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón agotado');
  END IF;

  IF _subtotal < v_coupon.min_order THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Pedido mínimo no alcanzado');
  END IF;

  IF v_coupon.discount_type = 'free_delivery' THEN
    IF COALESCE(_delivery_fee, 0) <= 0 THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Cupón válido só para entregas');
    END IF;
    v_discount := round(_delivery_fee, 2);
    RETURN jsonb_build_object(
      'valid', true,
      'coupon_id', v_coupon.id,
      'code', v_coupon.code,
      'discount_amount', v_discount,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'free_delivery', true
    );
  END IF;

  IF v_coupon.discount_type = 'combo_nth' THEN
    v_pid := COALESCE(v_coupon.linked_product_id, (v_coupon.promo_config->>'product_id')::uuid);
    v_min_items := COALESCE((v_coupon.promo_config->>'min_items')::integer, 3);
    v_nth_pct := COALESCE((v_coupon.promo_config->>'nth_discount_percent')::numeric, 50);

    IF v_pid IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Cupón mal configurado');
    END IF;

    v_cheapest_unit := NULL;
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_cart_items, '[]'::jsonb))
    LOOP
      IF (v_item->>'product_id')::uuid = v_pid THEN
        v_qty := GREATEST(COALESCE((v_item->>'quantity')::integer, 1), 1);
        v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
        v_total_qty := v_total_qty + v_qty;
        IF v_cheapest_unit IS NULL OR v_unit < v_cheapest_unit THEN
          v_cheapest_unit := v_unit;
        END IF;
      END IF;
    END LOOP;

    IF v_total_qty < v_min_items THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', format('Adicione pelo menos %s unidades do produto em promoção', v_min_items)
      );
    END IF;

    v_discount := round(COALESCE(v_cheapest_unit, 0) * (v_nth_pct / 100), 2);
    RETURN jsonb_build_object(
      'valid', true,
      'coupon_id', v_coupon.id,
      'code', v_coupon.code,
      'discount_amount', v_discount,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_nth_pct,
      'combo_applied', true
    );
  END IF;

  IF v_coupon.discount_type = 'percent' THEN
    v_discount := round(_subtotal * (v_coupon.discount_value / 100), 2);
  ELSE
    v_discount := least(v_coupon.discount_value, _subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_amount', v_discount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'free_delivery', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(uuid, text, numeric, numeric, jsonb) TO anon, authenticated;

-- Campanhas extra: entrega grátis e combo (para lojas já existentes)
INSERT INTO public.marketing_campaigns (
  store_id, name, campaign_type, message_template, trigger_event, title, push_url, is_active,
  preset_key, send_mode, audience_type, origin, title_pt, title_es, title_en,
  message_pt, message_es, message_en, language_mode, audience_config
)
SELECT
  s.id,
  v.name, v.campaign_type, v.message_template, v.trigger_event, v.title, '/', false,
  v.preset_key, v.send_mode, v.audience_type, 'preset',
  v.title_pt, v.title_es, v.title_en, v.message_pt, v.message_es, v.message_en,
  'customer_last', v.audience_config::jsonb
FROM public.stores s
CROSS JOIN (VALUES
  ('Entrega grátis +20€', 'promo', 'Pedidos a partir de 20€ — use {cupao_codigo}.', 'manual_only', 'Entrega grátis hoje', 'promo_delivery_free', 'manual', 'all_subscribers', 'Entrega grátis hoje 🛵', '¡Envío gratis hoy! 🛵', 'Free delivery today 🛵', 'Pedidos a partir de 20€ — use {cupao_codigo}.', 'Pedidos desde 20€ — usa {cupao_codigo}.', 'Orders over €20 — use {cupao_codigo}.', '{"suggest_coupon":"ENTREGA20"}'),
  ('Combo 3 kebabs', 'promo', 'Peça 3 {produto_destaque} — código {cupao_codigo}.', 'manual_only', 'Combo especial', 'promo_combo_kebab', 'manual', 'all_subscribers', 'Combo especial 🥙', '¡Combo especial! 🥙', 'Special combo 🥙', 'Peça 3 {produto_destaque} — 3.º com 50% off.', 'Pide 3 {produto_destaque} — 3.º con 50% dto.', 'Get 3 {produto_destaque} — 3rd half off.', '{"suggest_coupon":"KEBAB3X2"}')
) AS v(name, campaign_type, message_template, trigger_event, title, preset_key, send_mode, audience_type, title_pt, title_es, title_en, message_pt, message_es, message_en, audience_config)
WHERE s.is_active = true
ON CONFLICT (store_id, preset_key) WHERE preset_key IS NOT NULL DO NOTHING;
