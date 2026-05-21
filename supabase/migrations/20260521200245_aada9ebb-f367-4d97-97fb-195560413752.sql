
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS geocoded_address text;

ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS max_distance_km numeric,
  ADD COLUMN IF NOT EXISTS min_distance_km numeric DEFAULT 0;
