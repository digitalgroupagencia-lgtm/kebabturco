
-- Create store_payout_intake table for restaurant banking data
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_payout_intake TO authenticated;
GRANT ALL ON public.store_payout_intake TO service_role;

ALTER TABLE public.store_payout_intake ENABLE ROW LEVEL SECURITY;

-- Admin master and tenant admins of the store can manage intake
CREATE POLICY "Admin master can manage all payout intake"
  ON public.store_payout_intake
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Restaurant admins can manage their store intake"
  ON public.store_payout_intake
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.stores s ON s.tenant_id = ur.tenant_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'restaurant_admin'
        AND s.id = store_payout_intake.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.stores s ON s.tenant_id = ur.tenant_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'restaurant_admin'
        AND s.id = store_payout_intake.store_id
    )
  );

-- RPC fallback helpers used by the client
CREATE OR REPLACE FUNCTION public.get_store_payout_intake(_store_id uuid)
RETURNS public.store_payout_intake
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.store_payout_intake WHERE store_id = _store_id;
$$;

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_payout_intake (
    store_id, business_name, owner_full_name, iban,
    owner_email, owner_phone, tax_id, business_address, notes, updated_at
  ) VALUES (
    _store_id, _business_name, _owner_full_name, upper(replace(_iban, ' ', '')),
    _owner_email, _owner_phone, _tax_id, _business_address, _notes, now()
  )
  ON CONFLICT (store_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    owner_full_name = EXCLUDED.owner_full_name,
    iban = EXCLUDED.iban,
    owner_email = EXCLUDED.owner_email,
    owner_phone = EXCLUDED.owner_phone,
    tax_id = EXCLUDED.tax_id,
    business_address = EXCLUDED.business_address,
    notes = EXCLUDED.notes,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_payout_intake(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_store_payout_intake(uuid, text, text, text, text, text, text, text, text) TO authenticated, service_role;

CREATE TRIGGER store_payout_intake_set_updated_at
  BEFORE UPDATE ON public.store_payout_intake
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
