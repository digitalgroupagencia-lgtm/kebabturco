-- Corrige pagamentos: PostgreSQL não sabia qual add_loyalty_stamp usar (3 vs 4 parâmetros).
-- create_customer_order falhava com: function public.add_loyalty_stamp(uuid, text, uuid) is not unique

DROP FUNCTION IF EXISTS public.add_loyalty_stamp(uuid, text, uuid);

-- Garante a versão única (4º parâmetro opcional = total do pedido para pontos VIP)
CREATE OR REPLACE FUNCTION public.add_loyalty_stamp(
  _store_id uuid,
  _phone text,
  _customer_id uuid DEFAULT NULL,
  _order_total numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acc public.loyalty_accounts%ROWTYPE;
  v_stamps_needed constant integer := 10;
  v_points_earned integer;
  v_spend numeric;
  v_tier text;
BEGIN
  IF trim(_phone) = '' THEN
    RETURN jsonb_build_object('stamps', 0, 'points', 0, 'reward_ready', false, 'vip_tier', 'standard');
  END IF;

  v_spend := GREATEST(COALESCE(_order_total, 0), 0);
  v_points_earned := CASE
    WHEN v_spend > 0 THEN GREATEST(floor(v_spend * 10)::integer, 0)
    ELSE 30
  END;

  INSERT INTO public.loyalty_accounts (store_id, phone, customer_id, stamps, total_orders, points, lifetime_spend)
  VALUES (_store_id, trim(_phone), _customer_id, 1, 1, v_points_earned, v_spend)
  ON CONFLICT (store_id, phone) DO UPDATE SET
    stamps = public.loyalty_accounts.stamps + 1,
    total_orders = public.loyalty_accounts.total_orders + 1,
    points = public.loyalty_accounts.points + v_points_earned,
    lifetime_spend = public.loyalty_accounts.lifetime_spend + v_spend,
    customer_id = COALESCE(EXCLUDED.customer_id, public.loyalty_accounts.customer_id),
    updated_at = now()
  RETURNING * INTO v_acc;

  v_tier := CASE
    WHEN v_acc.lifetime_spend >= 300 THEN 'gold'
    WHEN v_acc.lifetime_spend >= 150 THEN 'silver'
    ELSE 'standard'
  END;

  IF v_tier IS DISTINCT FROM v_acc.vip_tier THEN
    UPDATE public.loyalty_accounts SET vip_tier = v_tier WHERE id = v_acc.id;
    v_acc.vip_tier := v_tier;
  END IF;

  RETURN jsonb_build_object(
    'stamps', v_acc.stamps,
    'stamps_needed', v_stamps_needed,
    'points', v_acc.points,
    'points_redeem_threshold', 500,
    'points_reward_eur', 5,
    'reward_ready', v_acc.stamps >= v_stamps_needed OR v_acc.points >= 500,
    'total_orders', v_acc.total_orders,
    'vip_tier', v_acc.vip_tier,
    'lifetime_spend', v_acc.lifetime_spend
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_loyalty_stamp(uuid, text, uuid, numeric) TO anon, authenticated;
