
-- ============ P1: WEEKLY SCHEDULES ============
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT
    '{"mon":{"open":true,"ranges":[["12:00","24:00"]]},
      "tue":{"open":true,"ranges":[["12:00","24:00"]]},
      "wed":{"open":true,"ranges":[["12:00","24:00"]]},
      "thu":{"open":true,"ranges":[["12:00","24:00"]]},
      "fri":{"open":true,"ranges":[["12:00","24:00"]]},
      "sat":{"open":true,"ranges":[["12:00","24:00"]]},
      "sun":{"open":true,"ranges":[["12:00","24:00"]]}}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_schedule jsonb NOT NULL DEFAULT
    '{"mon":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
      "tue":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
      "wed":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
      "thu":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
      "fri":{"open":true,"ranges":[["12:00","24:00"]]},
      "sat":{"open":true,"ranges":[["12:00","24:00"]]},
      "sun":{"open":true,"ranges":[["12:00","24:00"]]}}'::jsonb,
  ADD COLUMN IF NOT EXISTS schedule_timezone text NOT NULL DEFAULT 'Europe/Madrid';

-- Aplica seed Kebab Turco a TODAS as linhas existentes (overwrite com os horários oficiais)
UPDATE public.operations_settings SET
  weekly_schedule = '{"mon":{"open":true,"ranges":[["12:00","24:00"]]},
                     "tue":{"open":true,"ranges":[["12:00","24:00"]]},
                     "wed":{"open":true,"ranges":[["12:00","24:00"]]},
                     "thu":{"open":true,"ranges":[["12:00","24:00"]]},
                     "fri":{"open":true,"ranges":[["12:00","24:00"]]},
                     "sat":{"open":true,"ranges":[["12:00","24:00"]]},
                     "sun":{"open":true,"ranges":[["12:00","24:00"]]}}'::jsonb,
  delivery_schedule = '{"mon":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
                       "tue":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
                       "wed":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
                       "thu":{"open":true,"ranges":[["12:00","16:00"],["19:00","24:00"]]},
                       "fri":{"open":true,"ranges":[["12:00","24:00"]]},
                       "sat":{"open":true,"ranges":[["12:00","24:00"]]},
                       "sun":{"open":true,"ranges":[["12:00","24:00"]]}}'::jsonb,
  schedule_timezone = 'Europe/Madrid';

-- ============ P5: MESAS — APENAS ADMIN_MASTER GERE ============
-- Remove policies amplas que permitiam tenant_members criar/apagar mesas
DROP POLICY IF EXISTS "Tenant members manage tables" ON public.tables;
DROP POLICY IF EXISTS "Tenant manage tables" ON public.tables;

-- Cria policies granulares: SELECT para staff da loja; INSERT/UPDATE/DELETE só admin_master
CREATE POLICY "Staff read tables of own store"
  ON public.tables FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role) OR public.user_can_access_store(store_id));

CREATE POLICY "Admin master insert tables"
  ON public.tables FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

CREATE POLICY "Admin master update tables"
  ON public.tables FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::public.app_role));

CREATE POLICY "Admin master delete tables"
  ON public.tables FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));
