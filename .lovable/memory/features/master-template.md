---
name: Master Template white-label
description: Como o projeto serve de Master Template — bootstrap SQL, versionamento, propagação de updates
type: feature
---
Este projeto (Kebab Turco) é o **Master Template oficial** para gerar novos restaurantes via Remix.

## Arquivos chave
- `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql` — bootstrap idempotente (1 tenant, 1 store, 8 categorias, 24 produtos, banners, splash, totem, hours, plans). Rodar após Remix + ativar Cloud.
- `src/lib/templateVersion.ts` — constante `TEMPLATE_VERSION` (semver).
- Tabela `public._template_version` — versão aplicada no banco. Migration deve dar `UPDATE` aqui.
- `docs/MASTER_TEMPLATE_RESTAURANT.md` — visão geral.
- `docs/UPDATE_PROPAGATION_GUIDE.md` — passo a passo para propagar updates.
- `docs/TEMPLATE_VALIDATION_CHECKLIST.md` — 19 itens para validar clone.
- `docs/CHANGELOG_TEMPLATE.md` — registro de versões.

## Regras
- Migrations devem ser idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Toda migration relevante atualiza `_template_version`.
- Bumpar `TEMPLATE_VERSION` a cada release significativo.
- Nunca sobrescrever: `company_settings`, `stores`, `products`, `categories`, `promo_banners`, `delivery_zones`, `printer_settings`, `totem_config`, secrets.
- Sempre propagar: `src/`, `supabase/functions/`, `supabase/migrations/` novas, `public/`, `docs/`.
- Fallbacks UI obrigatórios (splash, idioma, loja, modalidade) caso DB esteja vazio.
- Banners aceitam imagem, MP4/MOV e MP3; intervalo vale só para imagens, vídeo/áudio avançam ao terminar.

## Fluxo de criação de novo restaurante (<30 min)
1. Remix → 2. Ativar Cloud → 3. Rodar BOOTSTRAP_MASTER_TEMPLATE.sql → 4. Trocar logo/cores/nome → 5. Cardápio.
