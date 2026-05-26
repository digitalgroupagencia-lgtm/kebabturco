-- Códigos de acesso rápido para equipe (PIN por funcionário / loja)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.staff_access_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_access_pins_user_role_unique UNIQUE (user_role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_access_pins_store ON public.staff_access_pins(store_id)
  WHERE is_active = true;

ALTER TABLE public.staff_access_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store managers manage staff pins" ON public.staff_access_pins;
CREATE POLICY "Store managers manage staff pins" ON public.staff_access_pins
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

DROP POLICY IF EXISTS "Store staff view pin status" ON public.staff_access_pins;
CREATE POLICY "Store staff view pin status" ON public.staff_access_pins
FOR SELECT TO authenticated
USING (
  public.user_can_access_store(auth.uid(), store_id)
);

CREATE OR REPLACE FUNCTION public.staff_pin_in_use(_store_id uuid, _pin text, _exclude_role_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_access_pins sap
    WHERE sap.store_id = _store_id
      AND sap.is_active
      AND (_exclude_role_id IS NULL OR sap.user_role_id <> _exclude_role_id)
      AND sap.pin_hash = crypt(_pin, sap.pin_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.upsert_staff_access_pin(_user_role_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id uuid;
  v_user_id uuid;
  v_can_manage boolean;
BEGIN
  IF _pin IS NULL OR _pin !~ '^\d{4,8}$' THEN
    RAISE EXCEPTION 'Código deve ter entre 4 e 8 dígitos';
  END IF;

  SELECT ur.store_id, ur.user_id INTO v_store_id, v_user_id
  FROM public.user_roles ur
  WHERE ur.id = _user_role_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Membro da equipe não encontrado';
  END IF;

  v_can_manage := public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.store_id = v_store_id
        AND ur.role IN ('restaurant_admin'::public.app_role, 'manager'::public.app_role)
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sem permissão para definir código de acesso';
  END IF;

  IF public.staff_pin_in_use(v_store_id, _pin, _user_role_id) THEN
    RAISE EXCEPTION 'Este código já está em uso nesta loja';
  END IF;

  INSERT INTO public.staff_access_pins (store_id, user_id, user_role_id, pin_hash)
  VALUES (v_store_id, v_user_id, _user_role_id, crypt(_pin, gen_salt('bf')))
  ON CONFLICT (user_role_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    is_active = true,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_staff_access_pin(_store_id uuid, _pin text)
RETURNS TABLE(user_id uuid, role public.app_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sap.user_id, ur.role
  FROM public.staff_access_pins sap
  JOIN public.user_roles ur ON ur.id = sap.user_role_id
  WHERE sap.store_id = _store_id
    AND sap.is_active
    AND ur.store_id = _store_id
    AND sap.pin_hash = crypt(_pin, sap.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_access_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_access_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_pin_in_use(uuid, text, uuid) TO authenticated;
