-- Marketing anti-spam: disabled by default (0 = no cap). When enabled, prefer 10/day.
-- Order status pushes: include delivery confirmation code for domicilio orders.

ALTER TABLE public.tenant_marketing_settings
  ALTER COLUMN anti_spam_max_pushes SET DEFAULT 0,
  ALTER COLUMN anti_spam_window_days SET DEFAULT 1;

COMMENT ON COLUMN public.tenant_marketing_settings.anti_spam_max_pushes IS
  'Max marketing pushes per customer in the window. 0 = disabled (no marketing cap).';

UPDATE public.tenant_marketing_settings
SET anti_spam_max_pushes = 0
WHERE anti_spam_max_pushes = 2 AND anti_spam_window_days = 30;

-- Only count real marketing sends (not team previews).
CREATE OR REPLACE FUNCTION public.marketing_push_count_recent(
  _store_id uuid,
  _customer_phone text,
  _window_days integer DEFAULT 1
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.campaign_send_log
  WHERE store_id = _store_id
    AND customer_phone = trim(_customer_phone)
    AND status = 'sent'
    AND sent_at >= now() - make_interval(days => GREATEST(_window_days, 1));
$$;

-- Delivery code in customer push when pedido a domicilio is ready / out for delivery.
CREATE OR REPLACE FUNCTION public.dispatch_customer_order_status_push(
  _order_id uuid,
  _event text,
  _order_number text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.platform_push_config%ROWTYPE;
  v_title text;
  v_body text;
  v_order_type text;
  v_delivery_code text;
BEGIN
  IF _order_id IS NULL OR NULLIF(trim(_event), '') IS NULL THEN
    RETURN;
  END IF;

  IF _event NOT IN (
    'payment_paid', 'preparing', 'ready', 'out_for_delivery',
    'delivered', 'collected', 'served', 'cancelled', 'pending'
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_cfg FROM public.platform_push_config WHERE id = 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT o.order_type, o.delivery_confirmation_code
  INTO v_order_type, v_delivery_code
  FROM public.orders o
  WHERE o.id = _order_id;

  SELECT m.title, m.body
  INTO v_title, v_body
  FROM public.customer_order_push_message(_event, _order_number) AS m;

  IF v_order_type = 'delivery'
     AND v_delivery_code IS NOT NULL
     AND trim(v_delivery_code) <> ''
     AND _event IN ('ready', 'out_for_delivery') THEN
    v_body := v_body || ' · Código: ' || trim(v_delivery_code);
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_cfg.functions_base_url, '/') || '/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'orderId', _order_id,
      'title', v_title,
      'body', v_body,
      'tag', 'order-' || _order_id::text,
      'url', '/?screen=tracking&order=' || _order_id::text
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_customer_order_status_push failed: %', SQLERRM;
END;
$$;
