-- Idioma principal por projeto
ALTER TABLE public.totem_config
  ADD COLUMN IF NOT EXISTS primary_language text NOT NULL DEFAULT 'es';

-- Ícones de bandeira por idioma (chave = código do idioma, valor = URL)
ALTER TABLE public.totem_config
  ADD COLUMN IF NOT EXISTS language_icons jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Telefone obrigatório em pedidos para levar
ALTER TABLE public.operations_settings
  ADD COLUMN IF NOT EXISTS require_phone_takeaway boolean NOT NULL DEFAULT true;

-- Lista de remoções por item (ingredientes que o cliente pediu para tirar)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS removed jsonb NOT NULL DEFAULT '[]'::jsonb;