-- Categorias Durum e Kapsalon no menu lateral (Kebab Turco)
-- Correr no SQL Editor do Supabase (projeto kvpssbhclafoymhecmuk)

DO $$
DECLARE
  v_store RECORD;
  v_cat_durum uuid;
  v_cat_kapsalon uuid;
  v_sort_durum int;
  v_sort_kapsalon int;
  v_moved_durum int;
  v_moved_kapsalon int;
BEGIN
  FOR v_store IN
    SELECT s.id
    FROM public.stores s
    JOIN public.tenants t ON t.id = s.tenant_id
    WHERE s.is_active = true
      AND t.slug = 'kebab-turco'
  LOOP
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_durum
    FROM public.categories WHERE store_id = v_store.id;

    v_sort_kapsalon := v_sort_durum + 1;

    SELECT id INTO v_cat_durum
    FROM public.categories
    WHERE store_id = v_store.id
      AND is_active = true
      AND (
        lower(COALESCE(name->>'es', '')) IN ('durum', 'dürüm', 'duerum')
        OR lower(COALESCE(name->>'pt', '')) IN ('durum', 'dürüm')
        OR lower(COALESCE(name->>'en', '')) IN ('durum', 'dürüm')
      )
    LIMIT 1;

    IF v_cat_durum IS NULL THEN
      INSERT INTO public.categories (store_id, name, sort_order, is_active)
      VALUES (
        v_store.id,
        '{"pt":"Durum","es":"Durum","en":"Durum","fr":"Durum"}'::jsonb,
        v_sort_durum,
        true
      )
      RETURNING id INTO v_cat_durum;
    END IF;

    SELECT id INTO v_cat_kapsalon
    FROM public.categories
    WHERE store_id = v_store.id
      AND is_active = true
      AND lower(COALESCE(name->>'es', name->>'pt', name->>'en', '')) = 'kapsalon'
    LIMIT 1;

    IF v_cat_kapsalon IS NULL THEN
      INSERT INTO public.categories (store_id, name, sort_order, is_active)
      VALUES (
        v_store.id,
        '{"pt":"Kapsalon","es":"Kapsalon","en":"Kapsalon","fr":"Kapsalon"}'::jsonb,
        v_sort_kapsalon,
        true
      )
      RETURNING id INTO v_cat_kapsalon;
    END IF;

    UPDATE public.products
    SET category_id = v_cat_kapsalon,
        updated_at = now()
    WHERE store_id = v_store.id
      AND is_active = true
      AND category_id IS DISTINCT FROM v_cat_kapsalon
      AND (
        COALESCE(name->>'es', '') ~* 'kapsalon'
        OR COALESCE(name->>'pt', '') ~* 'kapsalon'
        OR COALESCE(name->>'en', '') ~* 'kapsalon'
      );

    GET DIAGNOSTICS v_moved_kapsalon = ROW_COUNT;

    UPDATE public.products
    SET category_id = v_cat_durum,
        updated_at = now()
    WHERE store_id = v_store.id
      AND is_active = true
      AND category_id IS DISTINCT FROM v_cat_durum
      AND (
        COALESCE(name->>'es', '') ~* 'durum|dürüm|duerum'
        OR COALESCE(name->>'pt', '') ~* 'durum|dürüm'
        OR COALESCE(name->>'en', '') ~* 'durum|dürüm'
      )
      AND COALESCE(name->>'es', '') !~* 'kapsalon';

    GET DIAGNOSTICS v_moved_durum = ROW_COUNT;

    RAISE NOTICE 'Loja % — Durum: % produtos, Kapsalon: % produtos', v_store.id, v_moved_durum, v_moved_kapsalon;
  END LOOP;
END $$;

-- Verificar categorias e contagens
SELECT
  c.name->>'es' AS categoria,
  COUNT(p.id) AS produtos
FROM public.categories c
JOIN public.stores s ON s.id = c.store_id
JOIN public.tenants t ON t.id = s.tenant_id
LEFT JOIN public.products p ON p.category_id = c.id AND p.is_active = true
WHERE t.slug = 'kebab-turco'
  AND c.is_active = true
  AND lower(COALESCE(c.name->>'es', '')) IN ('durum', 'kapsalon')
GROUP BY c.id, c.name, c.sort_order
ORDER BY c.sort_order;
