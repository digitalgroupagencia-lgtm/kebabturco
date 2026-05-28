-- Copiar cardápio Gandia → Playa Gandia (colar no SQL Editor do Agile Transfer / Lovable).
-- Usar quando duplicate_store_menu ainda não existir ou Playa Gandia estiver vazia.
-- Seguro: só corre se Playa não tiver categorias.

DO $$
DECLARE
  v_src uuid := '22222222-2222-2222-2222-222222222222'; -- Gandia
  v_tgt uuid := '5291341c-807e-473f-a197-27185d170065'; -- Playa Gandia
  v_cat record;
  v_prod record;
  v_new_cat_id uuid;
  v_tgt_cats int;
BEGIN
  SELECT COUNT(*) INTO v_tgt_cats FROM public.categories WHERE store_id = v_tgt;
  IF v_tgt_cats > 0 THEN
    RAISE NOTICE 'Playa Gandia já tem % categorias — nada a fazer.', v_tgt_cats;
    RETURN;
  END IF;

  FOR v_cat IN
    SELECT * FROM public.categories
    WHERE store_id = v_src
    ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order)
    VALUES (v_tgt, v_cat.name, v_cat.image_url, v_cat.is_active, v_cat.sort_order)
    RETURNING id INTO v_new_cat_id;

    FOR v_prod IN
      SELECT * FROM public.products
      WHERE category_id = v_cat.id
      ORDER BY sort_order, created_at
    LOOP
      INSERT INTO public.products (
        store_id, category_id, name, description, price, image_url,
        is_active, is_bestseller, is_promo, sort_order, price_modifiers,
        product_type, combo_unit_count, unit_label, after_add_suggestions
      ) VALUES (
        v_tgt, v_new_cat_id, v_prod.name, v_prod.description, v_prod.price, v_prod.image_url,
        v_prod.is_active, v_prod.is_bestseller, v_prod.is_promo, v_prod.sort_order, v_prod.price_modifiers,
        v_prod.product_type, v_prod.combo_unit_count, v_prod.unit_label, v_prod.after_add_suggestions
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Cardápio copiado de Gandia para Playa Gandia.';
END $$;

-- Verificar:
-- SELECT s.name,
--   (SELECT COUNT(*) FROM categories c WHERE c.store_id = s.id) AS categorias,
--   (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id) AS produtos
-- FROM stores s ORDER BY s.name;
