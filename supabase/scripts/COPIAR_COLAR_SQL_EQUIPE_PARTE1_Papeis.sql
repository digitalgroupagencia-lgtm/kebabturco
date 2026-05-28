-- PARTE 1 — Colar e Run SOZINHO (sem SELECT no fim)
-- Se alguma linha disser "already exists", ignore — siga para a Parte 2.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendant';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery';

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
