-- Loja para login da equipa (anon) — uma loja activa, sem depender de domínio

CREATE OR REPLACE FUNCTION public.get_staff_login_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.stores s
  WHERE s.is_active = true
  ORDER BY s.sort_order ASC NULLS LAST, s.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_login_store_id() TO anon, authenticated;
