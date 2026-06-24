-- Repasses visíveis em tempo real no painel do restaurante.
ALTER TABLE public.store_payouts REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'store_payouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_payouts;
  END IF;
END $$;
