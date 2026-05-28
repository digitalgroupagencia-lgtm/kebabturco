-- PARTE 1B — OPCIONAL: correr numa query NOVA depois da Parte 1
-- Só para confirmar que os papéis existem.

SELECT unnest(enum_range(NULL::public.app_role)) AS papeis_disponiveis;
