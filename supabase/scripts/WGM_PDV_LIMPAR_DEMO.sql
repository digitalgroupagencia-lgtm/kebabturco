-- =============================================================================
-- PDV WGM — limpar TODOS os pedidos de teste do Kebab Turco
-- =============================================================================
-- ONDE: Supabase do PDV WGM / Flow Operations (giqqsqauirokzgraqobh)
--
-- Mantém só pedidos com origem app_cliente (vindos da app Kebab após pagamento).
-- Apaga demo, Teste Cursor, TEST WGM, pedidos sem cliente, etc.
-- =============================================================================

DO $$
DECLARE
  v_company_id uuid;
  v_orders int := 0;
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE slug = 'kebab-turco'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa kebab-turco não encontrada.';
  END IF;

  -- Pagamentos dos pedidos que não são da app
  DELETE FROM public.payments
  WHERE order_id IN (
    SELECT id FROM public.orders
    WHERE company_id = v_company_id
      AND COALESCE(origem::text, '') <> 'app_cliente'
  );

  DELETE FROM public.order_items
  WHERE order_id IN (
    SELECT id FROM public.orders
    WHERE company_id = v_company_id
      AND COALESCE(origem::text, '') <> 'app_cliente'
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'proprioapp_order_refs'
  ) THEN
    DELETE FROM public.proprioapp_order_refs
    WHERE company_id = v_company_id
      AND wgm_order_id IN (
        SELECT id FROM public.orders
        WHERE company_id = v_company_id
          AND COALESCE(origem::text, '') <> 'app_cliente'
      );
  END IF;

  DELETE FROM public.orders
  WHERE company_id = v_company_id
    AND COALESCE(origem::text, '') <> 'app_cliente';
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  -- Produtos e categorias de teste
  DELETE FROM public.products
  WHERE company_id = v_company_id
    AND (descricao ILIKE '%(demo)%' OR descricao ILIKE '%demonstra%');

  DELETE FROM public.categories
  WHERE company_id = v_company_id
    AND (descricao ILIKE '%(demo)%' OR descricao ILIKE '%demonstra%');

  DELETE FROM public.tables
  WHERE company_id = v_company_id
    AND nome IN ('Mesa 01', 'Mesa 02', 'Mesa 03', 'Mesa 04', 'Balcao', 'Balcão');

  -- Desliga MODO DEMO (registo de resumo da demonstração)
  DELETE FROM public.operation_logs WHERE company_id = v_company_id;

  DELETE FROM public.financial_entries
  WHERE company_id = v_company_id
    AND (descricao ILIKE '%demo%' OR descricao ILIKE '%demonstra%');

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'demo_registry'
  ) THEN
    DELETE FROM public.demo_registry WHERE company_id = v_company_id;
  END IF;

  UPDATE public.company_subscriptions
  SET observacoes = 'Kebab Turco — conta real'
  WHERE company_id = v_company_id;

  RAISE NOTICE '';
  RAISE NOTICE 'Pedidos de teste apagados: %', v_orders;
  RAISE NOTICE 'Ficam só pedidos vindos da app (origem app_cliente).';
  RAISE NOTICE 'Actualize o painel (F5).';
END $$;

-- Confirmação
SELECT
  COUNT(*) AS pedidos_restantes,
  COUNT(*) FILTER (WHERE COALESCE(o.origem::text, '') = 'app_cliente') AS da_app
FROM public.orders o
JOIN public.companies c ON c.id = o.company_id
WHERE c.slug = 'kebab-turco';

SELECT
  o.numero AS pedido,
  o.customer_name AS cliente,
  o.origem,
  o.total,
  o.created_at AS data
FROM public.orders o
JOIN public.companies c ON c.id = o.company_id
WHERE c.slug = 'kebab-turco'
ORDER BY o.created_at DESC
LIMIT 10;
