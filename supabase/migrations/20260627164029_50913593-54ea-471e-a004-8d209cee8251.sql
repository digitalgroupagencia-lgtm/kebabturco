-- Remove versão antiga de 3 argumentos de add_loyalty_stamp para eliminar
-- ambiguidade: "function public.add_loyalty_stamp(uuid, text, uuid) is not unique".
-- A versão correcta com 4 argumentos (inclui _order_total) é mantida.
DROP FUNCTION IF EXISTS public.add_loyalty_stamp(uuid, text, uuid);

-- Garantir que a versão 4-arg permanece e tem grants
GRANT EXECUTE ON FUNCTION public.add_loyalty_stamp(uuid, text, uuid, numeric) TO anon, authenticated;