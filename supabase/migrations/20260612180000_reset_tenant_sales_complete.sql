-- Ao zerar pedidos, limpar também financeiro, impressão e gateways (painel + admin ficam a zero).

CREATE OR REPLACE FUNCTION public.reset_tenant_data(
  _tenant_id UUID,
  _reset_orders BOOLEAN DEFAULT true,
  _reset_cash BOOLEAN DEFAULT true,
  _reset_stock BOOLEAN DEFAULT false,
  _reset_products BOOLEAN DEFAULT false,
  _reset_categories BOOLEAN DEFAULT false,
  _reset_banners BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders BIGINT := 0;
  v_cash BIGINT := 0;
  v_stock BIGINT := 0;
  v_products BIGINT := 0;
  v_categories BIGINT := 0;
  v_banners BIGINT := 0;
  v_ledger BIGINT := 0;
  v_print_jobs BIGINT := 0;
  v_gateway_tx BIGINT := 0;
  v_gateway_logs BIGINT := 0;
  v_coupon_redemptions BIGINT := 0;
  v_store_ids UUID[];
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin_master'::app_role) OR
    (has_role(auth.uid(), 'restaurant_admin'::app_role) AND get_user_tenant_id(auth.uid()) = _tenant_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT array_agg(id) INTO v_store_ids FROM stores WHERE tenant_id = _tenant_id;
  IF v_store_ids IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'deleted', jsonb_build_object(
        'orders', 0, 'cash', 0, 'stock', 0, 'products', 0, 'categories', 0, 'banners', 0,
        'ledger', 0, 'print_jobs', 0, 'gateway_transactions', 0, 'gateway_logs', 0, 'coupon_redemptions', 0
      )
    );
  END IF;

  IF _reset_orders THEN
    WITH d AS (
      DELETE FROM public.coupon_redemptions
      WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = ANY(v_store_ids))
      RETURNING 1
    ) SELECT COUNT(*) INTO v_coupon_redemptions FROM d;

    WITH d AS (
      DELETE FROM public.print_jobs
      WHERE store_id = ANY(v_store_ids)
         OR order_id IN (SELECT id FROM public.orders WHERE store_id = ANY(v_store_ids))
      RETURNING 1
    ) SELECT COUNT(*) INTO v_print_jobs FROM d;

    WITH d AS (
      DELETE FROM public.payment_gateway_logs
      WHERE store_id = ANY(v_store_ids)
      RETURNING 1
    ) SELECT COUNT(*) INTO v_gateway_logs FROM d;

    WITH d AS (
      DELETE FROM public.payment_gateway_transactions
      WHERE store_id = ANY(v_store_ids)
      RETURNING 1
    ) SELECT COUNT(*) INTO v_gateway_tx FROM d;

    WITH d AS (
      DELETE FROM public.store_payment_ledger
      WHERE store_id = ANY(v_store_ids)
      RETURNING 1
    ) SELECT COUNT(*) INTO v_ledger FROM d;

    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE store_id = ANY(v_store_ids));

    WITH d AS (
      DELETE FROM public.orders
      WHERE store_id = ANY(v_store_ids)
      RETURNING 1
    ) SELECT COUNT(*) INTO v_orders FROM d;
  END IF;

  IF _reset_cash THEN
    WITH d AS (DELETE FROM public.cash_registers WHERE store_id = ANY(v_store_ids) RETURNING 1)
    SELECT COUNT(*) INTO v_cash FROM d;
  END IF;

  IF _reset_stock THEN
    WITH d AS (DELETE FROM public.stock_items WHERE store_id = ANY(v_store_ids) RETURNING 1)
    SELECT COUNT(*) INTO v_stock FROM d;
  END IF;

  IF _reset_products THEN
    DELETE FROM public.product_extras WHERE product_id IN (SELECT id FROM public.products WHERE store_id = ANY(v_store_ids));
    DELETE FROM public.product_sizes WHERE product_id IN (SELECT id FROM public.products WHERE store_id = ANY(v_store_ids));
    DELETE FROM public.product_stock WHERE product_id IN (SELECT id FROM public.products WHERE store_id = ANY(v_store_ids));
    WITH d AS (DELETE FROM public.products WHERE store_id = ANY(v_store_ids) RETURNING 1)
    SELECT COUNT(*) INTO v_products FROM d;
  END IF;

  IF _reset_categories THEN
    WITH d AS (DELETE FROM public.categories WHERE store_id = ANY(v_store_ids) RETURNING 1)
    SELECT COUNT(*) INTO v_categories FROM d;
  END IF;

  IF _reset_banners THEN
    WITH d AS (DELETE FROM public.promo_banners WHERE store_id = ANY(v_store_ids) RETURNING 1)
    SELECT COUNT(*) INTO v_banners FROM d;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'orders', v_orders,
      'cash', v_cash,
      'stock', v_stock,
      'products', v_products,
      'categories', v_categories,
      'banners', v_banners,
      'ledger', v_ledger,
      'print_jobs', v_print_jobs,
      'gateway_transactions', v_gateway_tx,
      'gateway_logs', v_gateway_logs,
      'coupon_redemptions', v_coupon_redemptions
    )
  );
END;
$$;
