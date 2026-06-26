-- Corrige erro se order_support_messages já estiver no realtime (42710)
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
