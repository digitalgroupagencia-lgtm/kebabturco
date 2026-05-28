-- Correr numa query NOVA para ver se está tudo instalado

SELECT p.proname AS funcao, 'OK' AS estado
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'upsert_staff_access_pin',
    'verify_staff_access_pin',
    'lookup_staff_user_by_email',
    'get_driver_deliveries',
    'start_delivery',
    'confirm_delivery_with_code'
  )
ORDER BY p.proname;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'staff_access_pins'
) AS tabela_pins_ok;
