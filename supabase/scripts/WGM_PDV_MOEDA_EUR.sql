-- =============================================================================
-- PDV WGM — moeda Euro (€) para Kebab Turco
-- =============================================================================
-- ONDE: Supabase do PDV WGM / Flow Operations (giqqsqauirokzgraqobh)
-- NÃO correr no Supabase do Kebab.
--
-- A moeda fica na tabela company_localization (não em companies).
-- =============================================================================

DO $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE slug = 'kebab-turco'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Empresa kebab-turco não encontrada. Corra WGM_PDV_KEBAB_COMPLETO.sql primeiro.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_localization'
  ) THEN
    RAISE EXCEPTION 'Falta company_localization. Faça Publish no Lovable do projeto WGM.';
  END IF;

  INSERT INTO public.company_localization (
    company_id,
    country_code,
    currency_code,
    language_code,
    timezone,
    fiscal_profile_code,
    formato_data,
    formato_numero
  )
  VALUES (
    v_company_id,
    'ES',
    'EUR',
    'es-ES',
    'Europe/Madrid',
    'ES_VERIFACTU',
    'DD/MM/YYYY',
    'es-ES'
  )
  ON CONFLICT (company_id) DO UPDATE SET
    country_code = 'ES',
    currency_code = 'EUR',
    language_code = 'es-ES',
    timezone = 'Europe/Madrid',
    fiscal_profile_code = 'ES_VERIFACTU',
    formato_data = 'DD/MM/YYYY',
    formato_numero = 'es-ES',
    updated_at = now();

  RAISE NOTICE '';
  RAISE NOTICE 'Kebab Turco → país ES, moeda EUR, fuso Europe/Madrid';
  RAISE NOTICE 'No PDV: Configurações → Localização deve mostrar España / Euro';
END $$;

-- Confirmação
SELECT
  c.nome AS empresa,
  c.slug,
  cl.country_code AS pais,
  cl.currency_code AS moeda,
  cl.language_code AS idioma,
  cl.timezone AS fuso
FROM public.companies c
LEFT JOIN public.company_localization cl ON cl.company_id = c.id
WHERE c.slug = 'kebab-turco';
