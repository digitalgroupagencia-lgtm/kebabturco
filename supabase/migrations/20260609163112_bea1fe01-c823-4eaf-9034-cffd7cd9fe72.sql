-- 1) Tabela de avaliações
CREATE TABLE IF NOT EXISTS public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  driver_user_id uuid NULL,
  driver_name text NULL,
  rating smallint NOT NULL,
  comment text NULL,
  customer_name text NULL,
  customer_phone text NULL,
  order_type text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_reviews
  ADD CONSTRAINT order_reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_order_reviews_store ON public.order_reviews(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_reviews_driver ON public.order_reviews(driver_user_id);

GRANT SELECT, INSERT ON public.order_reviews TO authenticated;
GRANT SELECT ON public.order_reviews TO anon;
GRANT ALL ON public.order_reviews TO service_role;

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

-- Equipa da loja vê todas as avaliações da loja
CREATE POLICY "Store team can view reviews"
  ON public.order_reviews FOR SELECT
  TO authenticated
  USING (public.user_can_access_store(store_id) OR public.has_role(auth.uid(), 'admin_master'::public.app_role));

-- Cliente / qualquer um só pode inserir via função (bloqueamos insert directo)
CREATE POLICY "No direct insert"
  ON public.order_reviews FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 2) Função para submeter avaliação (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_order_review(
  _order_id uuid,
  _rating smallint,
  _comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_driver_name text;
  v_review_id uuid;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_rating');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.status::text <> 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_delivered');
  END IF;

  IF EXISTS (SELECT 1 FROM public.order_reviews WHERE order_id = _order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reviewed');
  END IF;

  -- Nome do entregador (se houver)
  IF v_order.assigned_driver_id IS NOT NULL THEN
    SELECT COALESCE(p.full_name, NULL) INTO v_driver_name
    FROM public.profiles p WHERE p.id = v_order.assigned_driver_id;
  END IF;

  INSERT INTO public.order_reviews (
    order_id, store_id, driver_user_id, driver_name,
    rating, comment, customer_name, customer_phone, order_type
  ) VALUES (
    v_order.id, v_order.store_id, v_order.assigned_driver_id, v_driver_name,
    _rating, NULLIF(trim(COALESCE(_comment, '')), ''),
    v_order.customer_name, v_order.customer_phone, v_order.order_type::text
  )
  RETURNING id INTO v_review_id;

  RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order_review(uuid, smallint, text) TO anon, authenticated;

-- 3) Vista de estatísticas por entregador
CREATE OR REPLACE VIEW public.driver_review_stats
WITH (security_invoker = on) AS
SELECT
  store_id,
  driver_user_id,
  COALESCE(MAX(driver_name), 'Sem entregador') AS driver_name,
  COUNT(*)::int AS reviews_count,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  MAX(created_at) AS last_review_at
FROM public.order_reviews
WHERE driver_user_id IS NOT NULL
GROUP BY store_id, driver_user_id;

GRANT SELECT ON public.driver_review_stats TO authenticated;

-- 4) Função pública para verificar se já avaliado (sem expor dados do pedido)
CREATE OR REPLACE FUNCTION public.has_order_review(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_reviews WHERE order_id = _order_id);
$$;

GRANT EXECUTE ON FUNCTION public.has_order_review(uuid) TO anon, authenticated;
