-- Marketing campaign engine: send log, extended campaigns, first-order view

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS trigger_event text DEFAULT 'first_order',
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS push_url text DEFAULT '/',
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

UPDATE public.marketing_campaigns
SET trigger_event = COALESCE(trigger_event, 'first_order'),
    push_url = COALESCE(push_url, '/')
WHERE trigger_event IS NULL OR push_url IS NULL;

CREATE TABLE IF NOT EXISTS public.campaign_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped', 'dry_run')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_send_log_store_sent
  ON public.campaign_send_log (store_id, sent_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_send_log_unique
  ON public.campaign_send_log (campaign_id, customer_phone)
  WHERE campaign_id IS NOT NULL AND status = 'sent';

ALTER TABLE public.campaign_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant manage campaign send log" ON public.campaign_send_log;
CREATE POLICY "Tenant manage campaign send log"
  ON public.campaign_send_log FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE OR REPLACE VIEW public.customer_first_orders AS
SELECT
  o.store_id,
  trim(o.customer_phone) AS customer_phone,
  min(o.created_at) AS first_order_at,
  count(*)::integer AS total_orders
FROM public.orders o
WHERE o.customer_phone IS NOT NULL
  AND trim(o.customer_phone) <> ''
  AND o.status <> 'cancelled'
GROUP BY o.store_id, trim(o.customer_phone);

GRANT SELECT ON public.customer_first_orders TO authenticated;
GRANT SELECT ON public.customer_first_orders TO service_role;
