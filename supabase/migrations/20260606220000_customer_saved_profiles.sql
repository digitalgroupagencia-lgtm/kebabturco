-- Perfil do cliente na nuvem (telefone + loja) — corre ao instalar no ecrã inicial

CREATE TABLE IF NOT EXISTS public.customer_saved_profiles (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  delivery jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, phone)
);

ALTER TABLE public.customer_saved_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read saved customer profiles" ON public.customer_saved_profiles;
CREATE POLICY "Public read saved customer profiles" ON public.customer_saved_profiles
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public upsert saved customer profiles" ON public.customer_saved_profiles;
CREATE POLICY "Public upsert saved customer profiles" ON public.customer_saved_profiles
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public update saved customer profiles" ON public.customer_saved_profiles;
CREATE POLICY "Public update saved customer profiles" ON public.customer_saved_profiles
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.upsert_customer_saved_profile(
  _store_id uuid,
  _phone text,
  _name text DEFAULT NULL,
  _delivery jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF _store_id IS NULL OR trim(_phone) = '' THEN
    RAISE EXCEPTION 'Loja ou telefone em falta';
  END IF;
  INSERT INTO public.customer_saved_profiles (store_id, phone, name, delivery, updated_at)
  VALUES (_store_id, trim(_phone), NULLIF(trim(_name), ''), COALESCE(_delivery, '{}'::jsonb), now())
  ON CONFLICT (store_id, phone) DO UPDATE SET
    name = COALESCE(NULLIF(trim(EXCLUDED.name), ''), public.customer_saved_profiles.name),
    delivery = CASE
      WHEN EXCLUDED.delivery IS NULL OR EXCLUDED.delivery = '{}'::jsonb THEN public.customer_saved_profiles.delivery
      ELSE EXCLUDED.delivery
    END,
    updated_at = now();
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_customer_saved_profile(_store_id uuid, _phone text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT jsonb_build_object(
    'name', c.name,
    'delivery', COALESCE(c.delivery, '{}'::jsonb),
    'updated_at', c.updated_at
  )
  FROM public.customer_saved_profiles c
  WHERE c.store_id = _store_id AND c.phone = trim(_phone)
  LIMIT 1;
$fn$;

GRANT EXECUTE ON FUNCTION public.upsert_customer_saved_profile(uuid, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_saved_profile(uuid, text) TO anon, authenticated;
