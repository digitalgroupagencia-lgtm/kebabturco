-- Fix ambiguous feature_key in get_tenant_feature_flags + ensure seller_app is OFF by default for all current tenants

CREATE OR REPLACE FUNCTION public.get_tenant_feature_flags(_tenant_id uuid)
RETURNS TABLE (
  feature_key text,
  name text,
  central_group text,
  enabled boolean,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH plan_feats AS (
    SELECT pf.feature_key AS fk, pf.name AS fname, pf.central_group AS fgroup, true AS from_plan
    FROM public.tenant_plan_assignments tpa
    JOIN public.plan_features plf ON plf.plan_id = tpa.plan_id
    JOIN public.platform_features pf ON pf.id = plf.feature_id
    WHERE tpa.tenant_id = _tenant_id AND pf.is_active = true
  ),
  ov AS (
    SELECT tfo.feature_key AS fk, tfo.enabled AS en
    FROM public.tenant_feature_overrides tfo
    WHERE tfo.tenant_id = _tenant_id
  ),
  all_feats AS (
    SELECT pf.feature_key AS fk, pf.name AS fname, pf.central_group AS fgroup
    FROM public.platform_features pf
    WHERE pf.is_active = true
  )
  SELECT
    af.fk,
    af.fname,
    af.fgroup,
    COALESCE(ov.en, EXISTS (SELECT 1 FROM plan_feats pf WHERE pf.fk = af.fk), false) AS enabled,
    CASE
      WHEN ov.fk IS NOT NULL THEN 'override'
      WHEN EXISTS (SELECT 1 FROM plan_feats pf WHERE pf.fk = af.fk) THEN 'plan'
      ELSE 'none'
    END AS source
  FROM all_feats af
  LEFT JOIN ov ON ov.fk = af.fk
  ORDER BY af.fgroup, af.fk;
END;
$$;

-- Seller module disabled by default for every existing tenant until admin master enables it.
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_key, enabled, notes)
SELECT t.id, 'seller_app', false, 'Default OFF — only platform admin can enable'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_feature_overrides o
  WHERE o.tenant_id = t.id AND o.feature_key = 'seller_app'
);