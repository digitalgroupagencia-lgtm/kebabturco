
DO $$
DECLARE
  v_src uuid := '22222222-2222-2222-2222-222222222222';
  v_tgt uuid := '5291341c-807e-473f-a197-27185d170065';
  v_cat record;
  v_new_cat_id uuid;
  v_tgt_cats int;
BEGIN
  SELECT COUNT(*) INTO v_tgt_cats FROM public.categories WHERE store_id = v_tgt;
  IF v_tgt_cats > 0 THEN
    RAISE NOTICE 'Playa Gandia já tem % categorias — nada a fazer.', v_tgt_cats;
    RETURN;
  END IF;

  FOR v_cat IN
    SELECT * FROM public.categories WHERE store_id = v_src ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.categories (store_id, name, image_url, is_active, sort_order)
    VALUES (v_tgt, v_cat.name, v_cat.image_url, v_cat.is_active, v_cat.sort_order)
    RETURNING id INTO v_new_cat_id;

    INSERT INTO public.products (
      store_id, category_id, name, description, price, image_url,
      is_active, is_bestseller, is_promo, sort_order, price_modifiers
    )
    SELECT
      v_tgt, v_new_cat_id, p.name, p.description, p.price, p.image_url,
      p.is_active, p.is_bestseller, p.is_promo, p.sort_order, p.price_modifiers
    FROM public.products p
    WHERE p.category_id = v_cat.id;
  END LOOP;
END $$;
