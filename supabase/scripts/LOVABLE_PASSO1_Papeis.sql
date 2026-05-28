-- PASSO 1 — Query NOVA, Executar SOZINHO (sem SELECT no fim)
-- Depois pode correr numa query separada:
-- SELECT unnest(enum_range(NULL::public.app_role)) AS papeis_disponiveis;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendant';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery';

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
