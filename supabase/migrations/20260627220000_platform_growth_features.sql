-- GPS motoboy, chat de apoio, analytics, fidelização pontos+VIP

-- ─── Localização do entregador ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_locations (
  driver_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  active_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision,
  heading_deg double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_store ON public.driver_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON public.driver_locations(active_order_id);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers upsert own location" ON public.driver_locations;
CREATE POLICY "Drivers upsert own location"
  ON public.driver_locations FOR ALL TO authenticated
  USING (driver_user_id = auth.uid())
  WITH CHECK (driver_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff read store driver locations" ON public.driver_locations;
CREATE POLICY "Staff read store driver locations"
  ON public.driver_locations FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin_master')
  );

-- ─── Chat de apoio ao pedido ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_phone text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.order_support_threads(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'staff')),
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON public.order_support_messages(thread_id, created_at);

ALTER TABLE public.order_support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read support threads by order" ON public.order_support_threads;
CREATE POLICY "Anyone read support threads by order"
  ON public.order_support_threads FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone insert support threads" ON public.order_support_threads;
CREATE POLICY "Anyone insert support threads"
  ON public.order_support_threads FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Staff update support threads" ON public.order_support_threads;
CREATE POLICY "Staff update support threads"
  ON public.order_support_threads FOR UPDATE TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone read support messages" ON public.order_support_messages;
CREATE POLICY "Anyone read support messages"
  ON public.order_support_messages FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone insert support messages" ON public.order_support_messages;
CREATE POLICY "Anyone insert support messages"
  ON public.order_support_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ─── Analytics de marketing ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  session_id text,
  customer_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_store_time ON public.marketing_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_name ON public.marketing_events(event_name, created_at DESC);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone insert marketing events" ON public.marketing_events;
CREATE POLICY "Anyone insert marketing events"
  ON public.marketing_events FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Staff read marketing events" ON public.marketing_events;
CREATE POLICY "Staff read marketing events"
  ON public.marketing_events FOR SELECT TO authenticated
  USING (
    store_id IS NULL
    OR store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin_master')
  );

-- ─── Fidelização: pontos + VIP ─────────────────────────────────────────────
ALTER TABLE public.loyalty_accounts
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_spend numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vip_tier text NOT NULL DEFAULT 'standard'
    CHECK (vip_tier IN ('standard', 'silver', 'gold'));

-- ─── RPCs ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_driver_location(
  _store_id uuid,
  _active_order_id uuid,
  _lat double precision,
  _lng double precision,
  _accuracy_m double precision DEFAULT NULL,
  _heading_deg double precision DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.driver_locations (
    driver_user_id, store_id, active_order_id, lat, lng, accuracy_m, heading_deg, updated_at
  ) VALUES (
    auth.uid(), _store_id, _active_order_id, _lat, _lng, _accuracy_m, _heading_deg, now()
  )
  ON CONFLICT (driver_user_id) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    active_order_id = EXCLUDED.active_order_id,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    accuracy_m = EXCLUDED.accuracy_m,
    heading_deg = EXCLUDED.heading_deg,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_driver_location TO authenticated;

CREATE OR REPLACE FUNCTION public.get_driver_location_for_order(_order_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'lat', dl.lat,
    'lng', dl.lng,
    'updated_at', dl.updated_at,
    'accuracy_m', dl.accuracy_m
  )
  FROM public.orders o
  JOIN public.driver_locations dl ON dl.active_order_id = o.id
  WHERE o.id = _order_id
    AND dl.updated_at > now() - interval '10 minutes'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_location_for_order TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_order_support_thread(
  _order_id uuid,
  _customer_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thread_id uuid;
  v_store_id uuid;
BEGIN
  SELECT id INTO v_thread_id FROM public.order_support_threads WHERE order_id = _order_id;
  IF v_thread_id IS NOT NULL THEN RETURN v_thread_id; END IF;

  SELECT store_id INTO v_store_id FROM public.orders WHERE id = _order_id;
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'order_not_found'; END IF;

  INSERT INTO public.order_support_threads (order_id, store_id, customer_phone)
  VALUES (_order_id, v_store_id, NULLIF(trim(_customer_phone), ''))
  RETURNING id INTO v_thread_id;

  RETURN v_thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_order_support_thread TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_order_support_message(
  _order_id uuid,
  _sender_role text,
  _body text,
  _customer_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thread_id uuid;
  v_msg_id uuid;
BEGIN
  IF _sender_role NOT IN ('customer', 'staff') THEN
    RAISE EXCEPTION 'invalid_sender';
  END IF;
  IF trim(_body) = '' THEN RAISE EXCEPTION 'empty_body'; END IF;

  v_thread_id := public.get_or_create_order_support_thread(_order_id, _customer_phone);

  INSERT INTO public.order_support_messages (thread_id, sender_role, body)
  VALUES (v_thread_id, _sender_role, trim(_body))
  RETURNING id INTO v_msg_id;

  UPDATE public.order_support_threads SET updated_at = now() WHERE id = v_thread_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_order_support_message TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_order_support_messages(_order_id uuid)
RETURNS TABLE(
  id uuid,
  sender_role text,
  body text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.sender_role, m.body, m.created_at
  FROM public.order_support_threads t
  JOIN public.order_support_messages m ON m.thread_id = t.id
  WHERE t.order_id = _order_id
  ORDER BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_order_support_messages TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_marketing_event(
  _store_id uuid,
  _event_name text,
  _session_id text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.marketing_events (store_id, event_name, session_id, customer_phone, metadata)
  VALUES (_store_id, trim(_event_name), NULLIF(trim(_session_id), ''), NULLIF(trim(_customer_phone), ''), COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_marketing_event TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_marketing_funnel_stats(
  _store_id uuid,
  _since timestamptz DEFAULT (now() - interval '30 days')
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ev AS (
    SELECT event_name, session_id
    FROM public.marketing_events
    WHERE store_id = _store_id AND created_at >= _since
  )
  SELECT jsonb_build_object(
    'menu_views', (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'menu_view'),
    'cart_starts', (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'cart_start'),
    'checkout_starts', (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'checkout_start'),
    'orders_completed', (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'order_completed'),
    'abandon_rate_pct', CASE
      WHEN (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'menu_view') = 0 THEN 0
      ELSE round(100.0 * (
        (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'menu_view')
        - (SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'order_completed')
      )::numeric / NULLIF((SELECT count(DISTINCT session_id) FROM ev WHERE event_name = 'menu_view'), 0), 1)
    END
  );
$$;

-- Realtime para chat de apoio
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_support_messages;


GRANT EXECUTE ON FUNCTION public.get_marketing_funnel_stats TO authenticated;

-- Pontos: 10 pontos por €1; 500 pontos = 5€ desconto; VIP silver 150€/90d, gold 300€/90d
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

CREATE OR REPLACE FUNCTION public.get_loyalty_status(
  _store_id uuid,
  _phone text
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'stamps', COALESCE(la.stamps, 0),
    'stamps_needed', 10,
    'points', COALESCE(la.points, 0),
    'points_redeem_threshold', 500,
    'points_reward_eur', 5,
    'total_orders', COALESCE(la.total_orders, 0),
    'reward_ready', COALESCE(la.stamps, 0) >= 10 OR COALESCE(la.points, 0) >= 500,
    'vip_tier', COALESCE(la.vip_tier, 'standard'),
    'lifetime_spend', COALESCE(la.lifetime_spend, 0),
    'vip_silver_at', 150,
    'vip_gold_at', 300
  )
  FROM (SELECT 1) x
  LEFT JOIN public.loyalty_accounts la
    ON la.store_id = _store_id AND la.phone = trim(_phone);
$$;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_support_messages;
  END IF;
END $do$;
