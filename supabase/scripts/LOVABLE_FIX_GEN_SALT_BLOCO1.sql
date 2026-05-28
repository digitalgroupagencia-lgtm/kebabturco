-- Colar na Lovable e Run — corrige "gen_salt does not exist"
-- Bloco 1 (se der erro, corre só o Bloco 2)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

SELECT 'Encriptacao activada' AS passo;
