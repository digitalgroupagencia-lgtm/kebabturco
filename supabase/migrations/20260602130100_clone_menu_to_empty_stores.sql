-- Após criar duplicate_store_menu: copiar cardápio para unidades vazias do mesmo tenant.
-- Ex.: Gandia (93 produtos) → Playa Gandia (0) fica independente após a cópia.

DO $$
DECLARE
  v_tenant record;
  v_src uuid;
  v_tgt uuid;
  v_src_count int;
BEGIN
  IF to_regprocedure('public.duplicate_store_menu(uuid,uuid,boolean,boolean)') IS NULL THEN
    RAISE NOTICE 'duplicate_store_menu não existe — ignorar bootstrap';
    RETURN;
  END IF;

  FOR v_tenant IN
    SELECT DISTINCT tenant_id AS id FROM public.stores WHERE tenant_id IS NOT NULL
  LOOP
    SELECT s.id,
           (SELECT COUNT(*)::int FROM public.categories c WHERE c.store_id = s.id)
    INTO v_src, v_src_count
    FROM public.stores s
    WHERE s.tenant_id = v_tenant.id
      AND COALESCE(s.is_active, true)
    ORDER BY (SELECT COUNT(*) FROM public.categories c WHERE c.store_id = s.id) DESC,
             s.sort_order NULLS LAST,
             s.created_at
    LIMIT 1;

    IF v_src IS NULL OR v_src_count = 0 THEN
      CONTINUE;
    END IF;

    FOR v_tgt IN
      SELECT s.id
      FROM public.stores s
      WHERE s.tenant_id = v_tenant.id
        AND COALESCE(s.is_active, true)
        AND s.id <> v_src
        AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.store_id = s.id)
    LOOP
      PERFORM public.duplicate_store_menu(v_src, v_tgt, true, false);
      RAISE NOTICE 'Cardápio copiado de % para %', v_src, v_tgt;
    END LOOP;
  END LOOP;
END $$;
