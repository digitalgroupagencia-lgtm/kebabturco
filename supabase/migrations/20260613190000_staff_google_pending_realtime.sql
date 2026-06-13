-- Atualização em tempo real dos pedidos Google da equipa no painel.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'staff_google_pending'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_google_pending;
  END IF;
END $$;
