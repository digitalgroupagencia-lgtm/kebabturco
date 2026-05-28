-- Push staff: disparo server-side em pedidos novos (não depende do browser do cliente)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.platform_push_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  functions_base_url text NOT NULL,
  staff_push_secret text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_push_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_push_config_service ON public.platform_push_config;
CREATE POLICY platform_push_config_service ON public.platform_push_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.platform_push_config (functions_base_url, staff_push_secret)
VALUES (
  'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1',
  ''
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.platform_push_config IS
  'Config push interno. Defina staff_push_secret igual a STAFF_PUSH_INTERNAL_SECRET (Edge) via SQL ou service_role.';

CREATE OR REPLACE FUNCTION public.dispatch_staff_new_order_push(
  _store_id uuid,
  _order_id uuid,
  _order_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.platform_push_config%ROWTYPE;
BEGIN
  IF _store_id IS NULL OR _order_id IS NULL OR NULLIF(trim(_order_number), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND OR NULLIF(trim(v_cfg.staff_push_secret), '') IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-staff-push-secret', v_cfg.staff_push_secret
    ),
    body := jsonb_build_object(
      'storeId', _store_id,
      'title', 'Novo pedido #' || trim(_order_number),
      'body', 'Pedido recebido — abre o painel para ver detalhes',
      'tag', 'staff-new-order-' || _order_id::text,
      'url', '/panel/live'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_staff_new_order_push failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_staff_new_order_push(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_staff_new_order_push(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_orders_staff_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending'::public.order_status THEN
    PERFORM public.dispatch_staff_new_order_push(NEW.store_id, NEW.id, NEW.order_number);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_staff_push_after_insert ON public.orders;
CREATE TRIGGER orders_staff_push_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_orders_staff_push();
