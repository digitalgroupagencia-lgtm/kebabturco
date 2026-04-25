INSERT INTO storage.buckets (id, name, public)
VALUES ('splash-media', 'splash-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read splash-media" ON storage.objects;
CREATE POLICY "Public read splash-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'splash-media');

DROP POLICY IF EXISTS "Auth upload splash-media" ON storage.objects;
CREATE POLICY "Auth upload splash-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'splash-media');

DROP POLICY IF EXISTS "Auth update splash-media" ON storage.objects;
CREATE POLICY "Auth update splash-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'splash-media');

DROP POLICY IF EXISTS "Auth delete splash-media" ON storage.objects;
CREATE POLICY "Auth delete splash-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'splash-media');