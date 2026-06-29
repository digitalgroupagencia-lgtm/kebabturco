-- Corrige regressões pós-build 10: marcar listo, push ambíguo, GRANTs em stores.
-- A Lovable aplica automaticamente ao fazer push (não precisa SQL manual).

-- 1) GRANTs: RLS em orders faz subquery em stores — sem SELECT falha "Erro ao actualizar"
DO $$
DECLARE
  t text;
  anon_readable text[] := ARRAY[
    'stores','tenants','categories','products','product_sizes','product_extras',
    'promo_banners','splash_media','delivery_zones','operations_settings',
    'company_settings','totem_config'
  ];
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF t = ANY(anon_readable) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT ON public.stores TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;

-- 2) Push: remover overload antigo (5 args) — PostgREST recusava com "not unique"
DROP FUNCTION IF EXISTS public.register_native_push_subscription(uuid, text, text, text, uuid);

-- 3) Pagamento balcão: remover overloads antigos
DROP FUNCTION IF EXISTS public.mark_order_paid_at_counter(uuid, text);
DROP FUNCTION IF EXISTS public.mark_order_paid_at_counter(uuid, text, text);

-- 4) Avançar pedido no painel (SECURITY DEFINER — não depende de GRANT em stores na RLS)
CREATE OR REPLACE FUNCTION public.panel_advance_order_status(
  _order_id uuid,
  _new_status public.order_status,
  _estimated_ready_at timestamptz DEFAULT NULL,
  _delivery_confirmation_code text DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_uid uuid := auth.uid();
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Login necessário';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin_master'::public.app_role)
    OR public.user_can_access_store(v_order.store_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para este pedido';
  END IF;

  IF v_order.status = 'pending'::public.order_status
     AND _new_status = 'preparing'::public.order_status THEN
    SELECT COALESCE(NULLIF(trim(p.full_name), ''), u.email::text, 'Operador')
    INTO v_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = v_uid;

    UPDATE public.orders SET
      status = _new_status,
      estimated_ready_at = COALESCE(_estimated_ready_at, estimated_ready_at),
      accepted_by_user_id = v_uid,
      accepted_at = now(),
      accepted_by_name = v_name,
      updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO v_order;
  ELSE
    UPDATE public.orders SET
      status = _new_status,
      estimated_ready_at = COALESCE(_estimated_ready_at, estimated_ready_at),
      delivery_confirmation_code = COALESCE(_delivery_confirmation_code, delivery_confirmation_code),
      updated_at = now()
    WHERE id = _order_id
    RETURNING * INTO v_order;
  END IF;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.panel_advance_order_status(uuid, public.order_status, timestamptz, text) TO authenticated;
