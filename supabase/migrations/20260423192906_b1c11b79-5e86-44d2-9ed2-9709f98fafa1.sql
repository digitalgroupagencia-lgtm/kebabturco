ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS header_color text NOT NULL DEFAULT '#D62300';