-- Cor oficial Kebab Turco #5F0504 (substitui vinhos/vermelhos anteriores).
UPDATE public.company_settings
SET
  primary_color = '#5F0504',
  header_color = '#5F0504',
  updated_at = now()
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid
  AND (
    primary_color IS NULL
    OR upper(primary_color) IN ('#D62300', '#CC0000', '#E63946', '#8B1A1A', '#5C1419', '#962E34', '#910318')
    OR header_color IS NULL
    OR upper(header_color) IN ('#D62300', '#CC0000', '#8B1A1A', '#5C1419', '#962E34')
  );
