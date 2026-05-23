-- Fase 5 — Storage: leitura pública de imagens, escrita isolada por loja/tenant

-- Remover policies permissivas antigas
DROP POLICY IF EXISTS "Authenticated can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Auth update splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete splash-media" ON storage.objects;
DROP POLICY IF EXISTS "Tenant write own branding" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own branding" ON storage.objects;
DROP POLICY IF EXISTS "Tenant delete own branding" ON storage.objects;
DROP POLICY IF EXISTS "Tenant write own products" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own products" ON storage.objects;
DROP POLICY IF EXISTS "Tenant delete own products" ON storage.objects;
DROP POLICY IF EXISTS "Tenant write own splash" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own splash" ON storage.objects;
DROP POLICY IF EXISTS "Tenant delete own splash" ON storage.objects;

-- Leitura pública mantida (cardápio / branding no site)
DROP POLICY IF EXISTS "Branding files are publicly readable" ON storage.objects;
CREATE POLICY "Branding files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Public read products bucket" ON storage.objects;
CREATE POLICY "Public read products bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Public read splash-media" ON storage.objects;
CREATE POLICY "Public read splash-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'splash-media');

-- Escrita: path = <store_id>/...
CREATE POLICY "Tenant write own branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant update own branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'branding'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant delete own branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'branding'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant write own products"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant update own products"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'products'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant delete own products"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'products'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant write own splash"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'splash-media'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant update own splash"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'splash-media'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

CREATE POLICY "Tenant delete own splash"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'splash-media'
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );
