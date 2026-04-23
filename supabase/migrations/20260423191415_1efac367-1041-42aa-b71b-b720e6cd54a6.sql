-- Tempo médio de preparo na operação
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS avg_prep_minutes integer NOT NULL DEFAULT 12;

-- Campos extras no pedido para impressão
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS table_number text;

-- printer_settings já tem agent_endpoint, port, ip_address. Garantimos defaults seguros.
ALTER TABLE public.printer_settings
  ALTER COLUMN port SET DEFAULT 9100;