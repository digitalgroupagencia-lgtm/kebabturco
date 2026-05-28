-- Duplicar cardápio entre unidades do mesmo tenant (cópias independentes).

CREATE OR REPLACE FUNCTION public.duplicate_store_menu(
  _source_store_id uuid,
  _target_store_id uuid,
  _copy_images boolean DEFAULT true,
  _replace_existing boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src_tenant uuid;
  v_tgt_tenant uuid;
  v_cat record;
  v_prod record;
  v_new_cat_id uuid;
  v_new_prod_id uuid;
  v_count_cat int := 0;
  v_count_prod int := 0;
  v_tgt_cats int := 0;
  v_tgt_prods int := 0;
BEGIN
  IF _source_store_id = _target_store_id THEN
    RAISE EXCEPTION 'Origem e destino devem ser unidades diferentes';
  END IF;

  SELECT tenant_id INTO v_src_tenant FROM stores WHERE id = _source_store_id;
  SELECT tenant_id INTO v_tgt_tenant FROM stores WHERE id = _target_store_id;

  IF v_src_tenant IS NULL OR v_tgt_tenant IS NULL THEN
    RAISE EXCEPTION 'Unidade de origem ou destino não encontrada';
  END IF;

  IF v_src_tenant <> v_tgt_tenant THEN
    RAISE EXCEPTION 'As unidades devem pertencer à mesma marca';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NOT (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR (
        public.user_can_access_store(_source_store_id)
        AND public.user_can_access_store(_target_store_id)
      )
    ) THEN
      RAISE EXCEPTION 'Sem permissão para duplicar cardápio';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_tgt_cats FROM categories WHERE store_id = _target_store_id;
  SELECT COUNT(*) INTO v_tgt_prods FROM products WHERE store_id = _target_store_id;

  IF (v_tgt_cats > 0 OR v_tgt_prods > 0) AND NOT _replace_existing THEN
    RAISE EXCEPTION 'A unidade destino já tem cardápio. Use substituir=true para apagar e copiar de novo.';
  END IF;

  IF _replace_existing THEN
    DELETE FROM products WHERE store_id = _target_store_id;
    DELETE FROM categories WHERE store_id = _target_store_id;
  END IF;

  FOR v_cat IN
    SELECT * FROM categories
    WHERE store_id = _source_store_id
    ORDER BY sort_order, created_at
  LOOP
    INSERT INTO categories (store_id, name, image_url, is_active, sort_order)
    VALUES (
      _target_store_id,
      v_cat.name,
      CASE WHEN _copy_images THEN v_cat.image_url ELSE NULL END,
      v_cat.is_active,
      v_cat.sort_order
    )
    RETURNING id INTO v_new_cat_id;
    v_count_cat := v_count_cat + 1;

    FOR v_prod IN
      SELECT * FROM products
      WHERE category_id = v_cat.id
      ORDER BY sort_order, created_at
    LOOP
      INSERT INTO products (
        store_id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_active,
        is_bestseller,
        is_promo,
        sort_order,
        price_modifiers,
        product_type,
        combo_unit_count,
        unit_label,
        after_add_suggestions
      )
      VALUES (
        _target_store_id,
        v_new_cat_id,
        v_prod.name,
        v_prod.description,
        v_prod.price,
        CASE WHEN _copy_images THEN v_prod.image_url ELSE NULL END,
        v_prod.is_active,
        v_prod.is_bestseller,
        v_prod.is_promo,
        v_prod.sort_order,
        COALESCE(v_prod.price_modifiers, '[]'::jsonb),
        COALESCE(v_prod.product_type, 'simple'),
        COALESCE(v_prod.combo_unit_count, 0),
        v_prod.unit_label,
        COALESCE(v_prod.after_add_suggestions, '[]'::jsonb)
      )
      RETURNING id INTO v_new_prod_id;
      v_count_prod := v_count_prod + 1;

      IF to_regclass('public.product_sizes') IS NOT NULL THEN
        INSERT INTO product_sizes (product_id, name, price_add, sort_order)
        SELECT v_new_prod_id, ps.name, ps.price_add, ps.sort_order
        FROM product_sizes ps
        WHERE ps.product_id = v_prod.id;
      END IF;

      IF to_regclass('public.product_extras') IS NOT NULL THEN
        INSERT INTO product_extras (product_id, name, price, max_qty, sort_order)
        SELECT v_new_prod_id, pe.name, pe.price, pe.max_qty, pe.sort_order
        FROM product_extras pe
        WHERE pe.product_id = v_prod.id;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'source_store_id', _source_store_id,
    'target_store_id', _target_store_id,
    'categories_copied', v_count_cat,
    'products_copied', v_count_prod
  );
END;
$$;

COMMENT ON FUNCTION public.duplicate_store_menu(uuid, uuid, boolean, boolean) IS
  'Copia categorias e produtos entre unidades da mesma marca. Edições futuras são independentes.';

GRANT EXECUTE ON FUNCTION public.duplicate_store_menu(uuid, uuid, boolean, boolean)
  TO authenticated, service_role;
