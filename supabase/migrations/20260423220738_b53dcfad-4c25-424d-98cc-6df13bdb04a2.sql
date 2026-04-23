ALTER TABLE public.promo_banners
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_autoplay boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_muted boolean NOT NULL DEFAULT true;

-- Permitir image_url ser NULL quando for vídeo
ALTER TABLE public.promo_banners ALTER COLUMN image_url DROP NOT NULL;