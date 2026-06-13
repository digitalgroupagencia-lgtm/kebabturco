-- 0/ adicionar bizum ao enum payment_method (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='public.payment_method'::regtype AND enumlabel='bizum') THEN
    ALTER TYPE public.payment_method ADD VALUE 'bizum';
  END IF;
END $$;