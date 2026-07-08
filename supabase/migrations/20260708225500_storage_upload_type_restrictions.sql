-- Upload security: permitir apenas formatos seguros de imagem
-- (bloqueia SVG e outras extensões perigosas nos buckets públicos).

DROP POLICY IF EXISTS "Tenant write own branding" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own branding" ON storage.objects;
DROP POLICY IF EXISTS "Tenant write own products" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own products" ON storage.objects;
DROP POLICY IF EXISTS "Tenant write own splash" ON storage.objects;
DROP POLICY IF EXISTS "Tenant update own splash" ON storage.objects;

CREATE POLICY "Tenant write own branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND COALESCE(lower(metadata->>'mimetype'), '') IN (
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
    )
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
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND COALESCE(lower(metadata->>'mimetype'), '') IN (
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
    )
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
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND COALESCE(lower(metadata->>'mimetype'), '') IN (
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
    )
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
  )
  WITH CHECK (
    bucket_id = 'products'
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND COALESCE(lower(metadata->>'mimetype'), '') IN (
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
    )
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
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND COALESCE(lower(metadata->>'mimetype'), '') IN (
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
    )
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
  )
  WITH CHECK (
    bucket_id = 'splash-media'
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND COALESCE(lower(metadata->>'mimetype'), '') IN (
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp'
    )
    AND (
      public.has_role(auth.uid(), 'admin_master'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id::text = (storage.foldername(name))[1]
          AND public.user_can_access_store(s.id)
      )
    )
  );

