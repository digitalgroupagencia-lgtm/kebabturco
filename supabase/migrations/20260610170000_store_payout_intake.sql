-- Dados bancários enviados pelo dono do restaurante (para registo manual na Stripe).
-- Converte o script manual supabase/scripts/LOVABLE_PASSO_dados_bancarios.sql numa
-- migração, para que a tabela e as funções sejam aplicadas automaticamente no deploy.
-- Idempotente: pode correr mesmo que já tenha sido executado manualmente.

CREATE TABLE IF NOT EXISTS public.store_payout_intake (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  owner_full_name text NOT NULL,
  owner_email text,
  owner_phone text,
  tax_id text,
  iban text NOT NULL,
  business_address text,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_payout_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers submit payout intake" ON public.store_payout_intake;
CREATE POLICY "Store managers submit payout intake" ON public.store_payout_intake
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR store_id IN (
    SELECT ur.store_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
      AND ur.store_id IS NOT NULL
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin_master'::public.app_role)
  OR store_id IN (
    SELECT ur.store_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
      AND ur.store_id IS NOT NULL
  )
);

CREATE OR REPLACE FUNCTION public.upsert_store_payout_intake(
  _store_id uuid,
  _business_name text,
  _owner_full_name text,
  _iban text,
  _owner_email text DEFAULT NULL,
  _owner_phone text DEFAULT NULL,
  _tax_id text DEFAULT NULL,
  _business_address text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = _store_id
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF _business_name IS NULL OR length(trim(_business_name)) < 2 THEN
    RAISE EXCEPTION 'Nome do negócio é obrigatório';
  END IF;
  IF _owner_full_name IS NULL OR length(trim(_owner_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nome do titular é obrigatório';
  END IF;
  IF _iban IS NULL OR length(replace(trim(_iban), ' ', '')) < 15 THEN
    RAISE EXCEPTION 'IBAN inválido';
  END IF;

  INSERT INTO public.store_payout_intake (
    store_id, business_name, owner_full_name, owner_email, owner_phone,
    tax_id, iban, business_address, notes, submitted_at, updated_at
  )
  VALUES (
    _store_id,
    trim(_business_name),
    trim(_owner_full_name),
    NULLIF(trim(_owner_email), ''),
    NULLIF(trim(_owner_phone), ''),
    NULLIF(trim(_tax_id), ''),
    upper(replace(trim(_iban), ' ', '')),
    NULLIF(trim(_business_address), ''),
    NULLIF(trim(_notes), ''),
    now(),
    now()
  )
  ON CONFLICT (store_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    owner_full_name = EXCLUDED.owner_full_name,
    owner_email = EXCLUDED.owner_email,
    owner_phone = EXCLUDED.owner_phone,
    tax_id = EXCLUDED.tax_id,
    iban = EXCLUDED.iban,
    business_address = EXCLUDED.business_address,
    notes = EXCLUDED.notes,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_store_payout_intake(uuid, text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_store_payout_intake(_store_id uuid)
RETURNS public.store_payout_intake
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.store_payout_intake;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = _store_id
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_row FROM public.store_payout_intake WHERE store_id = _store_id;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_payout_intake(uuid) TO authenticated;
