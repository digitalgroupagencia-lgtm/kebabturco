-- Fidelização anti-fraude:
-- atribui pontos/carimbo apenas quando payment_status muda para paid.

CREATE TABLE IF NOT EXISTS public.loyalty_order_awards (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_order_awards_store_awarded_at
  ON public.loyalty_order_awards(store_id, awarded_at DESC);

ALTER TABLE public.loyalty_order_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store team can read loyalty order awards" ON public.loyalty_order_awards;
CREATE POLICY "Store team can read loyalty order awards"
  ON public.loyalty_order_awards
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = loyalty_order_awards.store_id
    )
  );

CREATE OR REPLACE FUNCTION public.trg_award_loyalty_after_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM 'paid'::public.payment_status
     AND NEW.payment_status = 'paid'::public.payment_status
     AND NULLIF(trim(COALESCE(NEW.customer_phone, '')), '') IS NOT NULL THEN
    INSERT INTO public.loyalty_order_awards (order_id, store_id, customer_id, customer_phone)
    VALUES (NEW.id, NEW.store_id, NEW.customer_id, trim(NEW.customer_phone))
    ON CONFLICT (order_id) DO NOTHING;

    IF FOUND THEN
      PERFORM public.add_loyalty_stamp(
        NEW.store_id,
        trim(NEW.customer_phone),
        NEW.customer_id,
        COALESCE(NEW.total, 0)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_loyalty_after_paid ON public.orders;
CREATE TRIGGER trg_award_loyalty_after_paid
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_award_loyalty_after_paid();

