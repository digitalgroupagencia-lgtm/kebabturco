ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_by_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;