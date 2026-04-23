ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname='order_source' AND e.enumlabel='waiter') THEN
    ALTER TYPE public.order_source ADD VALUE 'waiter';
  END IF;
END$$;