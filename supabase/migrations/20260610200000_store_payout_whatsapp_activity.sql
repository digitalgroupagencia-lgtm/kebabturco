-- Registo de quando o dono envia dados / completa verificação pelo link WhatsApp.

ALTER TABLE public.store_payout_intake
  ADD COLUMN IF NOT EXISTS whatsapp_data_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at timestamptz;
