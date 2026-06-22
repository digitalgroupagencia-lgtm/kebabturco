-- Cor vinho oficial Kebab Turco Gandia (substitui vermelho legacy #D62300 na BD).
UPDATE public.company_settings
SET
  primary_color = '#8B1A1A',
  header_color = '#5C1419',
  updated_at = now()
WHERE store_id = '22222222-2222-2222-2222-222222222222'::uuid
  AND (
    primary_color IS NULL
    OR upper(primary_color) IN ('#D62300', '#CC0000', '#E63946')
    OR header_color IS NULL
    OR upper(header_color) IN ('#D62300', '#CC0000')
  );
