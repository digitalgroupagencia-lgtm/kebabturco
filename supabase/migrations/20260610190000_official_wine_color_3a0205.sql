-- Cor oficial única #3A0205 em todas as lojas com cores legacy ou #5F0504.
UPDATE public.company_settings
SET
  primary_color = '#3A0205',
  header_color = '#3A0205',
  updated_at = now()
WHERE upper(primary_color) IN (
    '#D62300', '#CC0000', '#E63946', '#8B1A1A', '#5C1419', '#962E34', '#910318', '#5F0504'
  )
  OR upper(header_color) IN (
    '#D62300', '#CC0000', '#8B1A1A', '#5C1419', '#962E34', '#910318', '#5F0504'
  );
