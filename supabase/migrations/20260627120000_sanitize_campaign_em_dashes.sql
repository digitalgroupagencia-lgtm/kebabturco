-- Remove traço longo (—) de textos de campanhas já guardados na base de dados.
UPDATE public.marketing_campaigns
SET
  title = regexp_replace(regexp_replace(COALESCE(title, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  message_template = regexp_replace(regexp_replace(COALESCE(message_template, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  title_pt = regexp_replace(regexp_replace(COALESCE(title_pt, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  title_es = regexp_replace(regexp_replace(COALESCE(title_es, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  title_en = regexp_replace(regexp_replace(COALESCE(title_en, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  message_pt = regexp_replace(regexp_replace(COALESCE(message_pt, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  message_es = regexp_replace(regexp_replace(COALESCE(message_es, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g'),
  message_en = regexp_replace(regexp_replace(COALESCE(message_en, ''), '\s*—\s*', ', ', 'g'), '—', ', ', 'g')
WHERE
  COALESCE(title, '') LIKE '%—%'
  OR COALESCE(message_template, '') LIKE '%—%'
  OR COALESCE(title_pt, '') LIKE '%—%'
  OR COALESCE(title_es, '') LIKE '%—%'
  OR COALESCE(title_en, '') LIKE '%—%'
  OR COALESCE(message_pt, '') LIKE '%—%'
  OR COALESCE(message_es, '') LIKE '%—%'
  OR COALESCE(message_en, '') LIKE '%—%';
