
-- 1. Enum de status do job
DO $$ BEGIN
  CREATE TYPE public.print_job_status AS ENUM ('pending', 'printing', 'printed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Coluna de cópias na printer_settings
ALTER TABLE public.printer_settings
  ADD COLUMN IF NOT EXISTS printer_copies INTEGER NOT NULL DEFAULT 1;

-- 3. Tabela print_jobs
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID,
  order_id UUID,
  printer_ip TEXT NOT NULL DEFAULT '192.168.1.200',
  printer_port INTEGER NOT NULL DEFAULT 9100,
  ticket_data TEXT NOT NULL,
  status public.print_job_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create print jobs" ON public.print_jobs;
CREATE POLICY "Anyone can create print jobs" ON public.print_jobs FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read print jobs" ON public.print_jobs;
CREATE POLICY "Anyone can read print jobs" ON public.print_jobs FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can update print jobs" ON public.print_jobs;
CREATE POLICY "Anyone can update print jobs" ON public.print_jobs FOR UPDATE TO public USING (true);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger de updated_at
DROP TRIGGER IF EXISTS update_print_jobs_updated_at ON public.print_jobs;
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RPC enqueue_print_job
CREATE OR REPLACE FUNCTION public.enqueue_print_job(
  _ticket_data TEXT,
  _store_id UUID,
  _order_id UUID DEFAULT NULL,
  _copies_override INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ip TEXT;
  _port INTEGER;
  _copies INTEGER;
  _job_id UUID;
BEGIN
  SELECT ip_address, port, printer_copies
    INTO _ip, _port, _copies
  FROM public.printer_settings
  WHERE store_id = _store_id
  LIMIT 1;

  _ip := COALESCE(_ip, '192.168.1.200');
  _port := COALESCE(_port, 9100);
  _copies := COALESCE(_copies_override, _copies, 1);

  INSERT INTO public.print_jobs (store_id, order_id, printer_ip, printer_port, ticket_data, copies, status)
  VALUES (_store_id, _order_id, _ip, _port, _ticket_data, _copies, 'pending')
  RETURNING id INTO _job_id;

  RETURN _job_id;
END;
$$;
