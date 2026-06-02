-- Activar pagamento em dinheiro no balcão por defeito (lojas existentes + novas).

ALTER TABLE public.operations_settings
  ALTER COLUMN pay_cash_enabled SET DEFAULT true,
  ALTER COLUMN pay_cash_takeaway SET DEFAULT true,
  ALTER COLUMN require_prepayment_takeaway SET DEFAULT false;

UPDATE public.operations_settings
SET
  pay_cash_enabled = true,
  pay_cash_takeaway = true,
  require_prepayment_takeaway = false;
