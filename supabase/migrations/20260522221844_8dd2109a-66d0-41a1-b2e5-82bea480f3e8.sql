
-- 1. Orders: remove anon SELECT (expõe nome/telefone de clientes)
DROP POLICY IF EXISTS "Anon can read orders by id" ON public.orders;

-- 2. order_items: remove INSERT anónimo direto (vulnerável)
DROP POLICY IF EXISTS "Anon can insert order_items for existing orders" ON public.order_items;

-- 3. print_jobs: tabela exposta publicamente
DROP POLICY IF EXISTS "Anyone can create print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Anyone can read print jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Anyone can update print jobs" ON public.print_jobs;

CREATE POLICY "Tenant members manage print_jobs"
ON public.print_jobs
FOR ALL
TO authenticated
USING (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())))
WITH CHECK (store_id IN (SELECT s.id FROM public.stores s WHERE s.tenant_id = public.get_user_tenant_id(auth.uid())));

-- 4. platform_settings: restringir a admin_master
DROP POLICY IF EXISTS "Public can read platform_settings" ON public.platform_settings;

-- 5. create_customer_order: ignora payment_status/stripe_payment_intent_id do cliente anónimo
CREATE OR REPLACE FUNCTION public.create_customer_order(
  _store_id uuid, _order_type text, _items jsonb, _total numeric,
  _subtotal numeric DEFAULT NULL::numeric, _table_number text DEFAULT NULL::text,
  _table_id uuid DEFAULT NULL::uuid, _customer_name text DEFAULT NULL::text,
  _customer_phone text DEFAULT NULL::text, _notes text DEFAULT NULL::text,
  _payment_method text DEFAULT NULL::text, _payment_status text DEFAULT 'pending'::text,
  _stripe_payment_intent_id text DEFAULT NULL::text, _application_fee_cents integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session uuid;
  v_customer uuid;
  v_order uuid;
  v_order_number text;
  v_item jsonb;
  v_qty int;
  v_unit numeric;
  v_line numeric;
  v_pm public.payment_method;
  v_ps public.payment_status;
  v_is_authed boolean := (auth.uid() IS NOT NULL);
  v_eff_status text;
  v_eff_pi text;
  v_eff_fee int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND is_active = true) THEN
    RAISE EXCEPTION 'Loja inválida';
  END IF;

  v_order_number := public.next_order_number(_store_id);

  IF _order_type = 'dine_in' AND _table_number IS NOT NULL THEN
    v_session := public.open_or_get_table_session_public(_store_id, _table_number, _table_id);
    v_customer := public.add_or_get_table_customer_public(v_session, COALESCE(_customer_name, 'Cliente'));
  END IF;

  -- SEGURANÇA: cliente anónimo nunca pode marcar pedido como pago directamente
  IF v_is_authed THEN
    v_eff_status := COALESCE(_payment_status, 'pending');
    v_eff_pi := _stripe_payment_intent_id;
    v_eff_fee := COALESCE(_application_fee_cents, 0);
  ELSE
    v_eff_status := 'pending';
    v_eff_pi := NULL;
    v_eff_fee := 0;
  END IF;

  v_ps := v_eff_status::public.payment_status;

  v_pm := CASE _payment_method
    WHEN 'card' THEN 'card'::public.payment_method
    WHEN 'cash' THEN 'cash'::public.payment_method
    WHEN 'pix' THEN 'pix'::public.payment_method
    WHEN 'apple_pay' THEN 'apple_pay'::public.payment_method
    WHEN 'google_pay' THEN 'google_pay'::public.payment_method
    ELSE NULL
  END;

  INSERT INTO public.orders (
    store_id, order_number, source, status, order_type,
    customer_name, customer_phone, table_number,
    table_session_id, table_customer_id,
    subtotal, total, notes,
    payment_method, payment_status, stripe_payment_intent_id, application_fee_cents
  ) VALUES (
    _store_id, v_order_number, 'totem'::order_source, 'pending'::order_status, _order_type,
    NULLIF(trim(_customer_name), ''), NULLIF(trim(_customer_phone), ''), _table_number,
    v_session, v_customer,
    COALESCE(_subtotal, _total), _total, _notes,
    v_pm, v_ps, v_eff_pi, v_eff_fee
  ) RETURNING id INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 1);
    v_unit := COALESCE((v_item->>'unit_price')::numeric, 0);
    v_line := COALESCE((v_item->>'total_price')::numeric, v_qty * v_unit);

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      size_name, extras, removed, notes
    ) VALUES (
      v_order,
      NULLIF(v_item->>'product_id', '')::uuid,
      COALESCE(v_item->>'product_name', 'Item'),
      v_qty, v_unit, v_line,
      v_item->>'size_name',
      COALESCE(v_item->'extras', '[]'::jsonb),
      COALESCE(v_item->'removed', '[]'::jsonb),
      v_item->>'notes'
    );
  END LOOP;

  IF v_session IS NOT NULL AND v_customer IS NOT NULL THEN
    UPDATE public.table_session_customers
    SET total_amount = total_amount + _total, updated_at = now()
    WHERE id = v_customer;
    UPDATE public.table_sessions
    SET total_amount = total_amount + _total, updated_at = now()
    WHERE id = v_session;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order,
    'order_number', v_order_number,
    'session_id', v_session,
    'customer_id', v_customer
  );
END;
$function$;

-- 6. RPC pública para consulta de pedido por id (ecrã de confirmação)
CREATE OR REPLACE FUNCTION public.get_order_public(_order_id uuid)
RETURNS TABLE(
  id uuid, order_number text, status text, payment_status text,
  total numeric, order_type text, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, order_number, status::text, payment_status::text, total, order_type, created_at
  FROM public.orders WHERE id = _order_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;

-- 7. Storage: políticas isolando por tenant (path = <store_id>/...)
DROP POLICY IF EXISTS "Anyone can upload to branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete splash-media" ON storage.objects;

CREATE POLICY "Tenant write own branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  )
);
CREATE POLICY "Tenant update own branding"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'branding' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);
CREATE POLICY "Tenant delete own branding"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'branding' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);

CREATE POLICY "Tenant write own products"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'products' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);
CREATE POLICY "Tenant update own products"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'products' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);
CREATE POLICY "Tenant delete own products"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'products' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);

CREATE POLICY "Tenant write own splash"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'splash-media' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);
CREATE POLICY "Tenant update own splash"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'splash-media' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);
CREATE POLICY "Tenant delete own splash"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'splash-media' AND (
    public.has_role(auth.uid(), 'admin_master'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.tenant_id = public.get_user_tenant_id(auth.uid()))
  )
);
