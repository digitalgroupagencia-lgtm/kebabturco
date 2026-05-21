INSERT INTO public.user_roles (user_id, role)
SELECT 'a239dcc8-03d4-4edb-bed9-18628c3f5667', 'admin_master'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = 'a239dcc8-03d4-4edb-bed9-18628c3f5667' AND role = 'admin_master'
);