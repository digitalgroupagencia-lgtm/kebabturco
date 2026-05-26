ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS configuration jsonb;

COMMENT ON COLUMN public.order_items.selections IS 'Escolhas estruturadas feitas pelo cliente no item do pedido';
COMMENT ON COLUMN public.order_items.configuration IS 'Configuração completa do item no momento do pedido';