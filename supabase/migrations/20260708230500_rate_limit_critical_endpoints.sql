-- Rate limiting server-side para endpoints críticos (fallback sem IP).

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key_action_created
  ON public.rate_limit_events(key, action, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access rate_limit_events" ON public.rate_limit_events;
CREATE POLICY "No direct access rate_limit_events"
  ON public.rate_limit_events
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.assert_rate_limit(
  _key text,
  _action text,
  _max_hits integer,
  _window_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF _key IS NULL OR trim(_key) = '' THEN
    RAISE EXCEPTION 'rate_limit_key_missing';
  END IF;
  IF _action IS NULL OR trim(_action) = '' THEN
    RAISE EXCEPTION 'rate_limit_action_missing';
  END IF;
  IF COALESCE(_max_hits, 0) <= 0 OR COALESCE(_window_seconds, 0) <= 0 THEN
    RAISE EXCEPTION 'rate_limit_config_invalid';
  END IF;

  DELETE FROM public.rate_limit_events
  WHERE created_at < now() - interval '1 day';

  SELECT COUNT(*)::int
    INTO v_count
  FROM public.rate_limit_events
  WHERE key = _key
    AND action = _action
    AND created_at >= now() - make_interval(secs => _window_seconds);

  IF v_count >= _max_hits THEN
    RAISE EXCEPTION 'Muitas tentativas. Aguarde e tente novamente.';
  END IF;

  INSERT INTO public.rate_limit_events(key, action)
  VALUES (_key, _action);
END;
$$;

