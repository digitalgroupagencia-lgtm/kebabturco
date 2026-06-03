-- Add print_mode column with safe default = 'bridge'
ALTER TABLE public.printer_settings
  ADD COLUMN IF NOT EXISTS print_mode text NOT NULL DEFAULT 'bridge'
    CHECK (print_mode IN ('bridge', 'android_direct'));

-- Configure Kebab Turco Gandia for direct Android printing
UPDATE public.printer_settings
SET print_mode = 'android_direct',
    ip_address = '192.168.1.100',
    port = 9100,
    enabled = true
WHERE store_id = '22222222-2222-2222-2222-222222222222';

-- Ensure a printer_settings row exists for Gandia even if missing
INSERT INTO public.printer_settings (store_id, printer_name, ip_address, port, enabled, print_mode)
SELECT '22222222-2222-2222-2222-222222222222', 'Cocina', '192.168.1.100', 9100, true, 'android_direct'
WHERE NOT EXISTS (
  SELECT 1 FROM public.printer_settings WHERE store_id = '22222222-2222-2222-2222-222222222222'
);
