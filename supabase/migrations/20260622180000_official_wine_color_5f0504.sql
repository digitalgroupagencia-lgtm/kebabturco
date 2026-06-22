-- Cor oficial única #5F0504 em todas as lojas com cores legacy.
UPDATE public.company_settings
SET
  primary_color = '#5F0504',
  header_color = '#5F0504',
  updated_at = now()
WHERE upper(primary_color) IN (
    '#D62300', '#CC0000', '#E63946', '#8B1A1A', '#5C1419', '#962E34', '#910318'
  )
  OR upper(header_color) IN (
    '#D62300', '#CC0000', '#8B1A1A', '#5C1419', '#962E34', '#910318'
  );
