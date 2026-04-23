
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_settings;
ALTER TABLE public.company_settings REPLICA IDENTITY FULL;
