# Relatório Final — Arquitetura Atual PropioApp

Data: Junho 2026 — pós Fases Multi-Tenant + Distribuição Comercial.
Este documento consolida o estado real do sistema. Não descreve planos futuros como já feitos.

---

## 1. Visão Geral

PropioApp é uma plataforma SaaS multi-tenant para restaurantes, composta por:

1. **PropioApp Master** — app/plataforma institucional + painel administrativo global.
2. **PWA por restaurante (Standard)** — cada tenant tem seu PWA isolado.
3. **App Nativo por restaurante (Premium)** — planejado, estrutura de banco pronta, sem build real.

Backend: Lovable Cloud (Supabase) com RLS em todas as tabelas operacionais.
Frontend: React 18 + Vite + Tailwind + shadcn.

---

## 2. Rotas Atuais

### Rotas públicas / resolução de tenant
| Rota | Comportamento |
|---|---|
| `/` | `RootRoute` → landing `PropioLanding` se nenhum tenant resolvido; senão renderiza loja |
| `/?tenant=<slug>` | Resolve tenant por query string |
| `/<slug>` | Resolve tenant por primeiro segmento do path (ex. `/toni-pizzeria`) |
| host = `tenants.custom_domain` | Resolve tenant por hostname |
| `/auth` | Login geral |
| `/staff` | Login staff |
| `/install`, `/privacy`, `/terms`, `/delete-account`, `/support` | Páginas institucionais/legais |

### Painel do restaurante (`/panel/*`)
`live`, `kitchen`, `dashboard`, `table-map`, `cashier`, `team`, `sellers`, `tables`, `finance`, `settings`, `guide`, `payments`.

### Painel master (`/admin/*`)
Operação: `menu`, `modifiers`, `delivery-zones`, `coupons`, `loyalty`, `stores`, `tenants/new`, `tables`, `screens`, `languages`, `finance`, `totem`, `stock`, `reports`, `plans`, `routes`, `branding`, `banner`, `operations`, `users`, `settings`, `guide`.
Centrais: `centrals`, `centrals/ai`, `centrals/loyalty`, `centrals/campaigns`, `centrals/push`, `centrals/conversational`.
Diagnóstico: `monitoring`, `diagnostics`, `diagnostics-hub`, `push-test`, `order-simulator`, `printer`.
Plataforma: `template-version`, `white-label`, `conversations`, `payments`.
**Distribuição (novas):** `distribution`, `distribution/:tenantId`, `build-center`, `release-center`.

### Outras áreas
`/seller/*`, `/delivery/*`, `/cashier`.

---

## 3. Tabelas Novas (Fases recentes)

| Tabela | Função |
|---|---|
| `tenant_app_distribution` (1:1 com `tenants`) | Tipo de distribuição (PWA/Native), status PWA, dados Android (package, versão, status, URL Play), dados iOS (bundle, versão, status, URL App Store), assets nativos (icon, splash, screenshots) |
| `tenant_app_builds` | Histórico de builds Android/iOS — status, versão, notas |
| `store_payment_gateways` | Estado por loja de cada gateway (stripe/redsys/bizum): status, ambiente, última validação |
| `payment_gateways` | Catálogo global de gateways disponíveis |

**Enums novos:** `app_distribution_type`, `pwa_status`, `app_store_status`, `app_build_platform`, `app_build_status`.

**Triggers:**
- `seed_tenant_app_distribution` → cria linha default (`pwa` / `active` / `not_started`) ao inserir tenant.
- `store_payment_gateways` populado automaticamente em status `disabled` para cada nova store.

**RLS:** `admin_master` acesso total; `restaurant_admin` leitura do próprio tenant.

---

## 4. Fluxos SaaS

### Resolução de tenant (runtime)
1. `useResolvedStore` lê: `custom_domain` (hostname) → `?tenant=` → `/<slug>`.
2. Se nada resolver em `/`, mostra `PropioLanding`.
3. Edge function `tenant-manifest` serve `manifest.json` dinâmico por host.
4. `company_settings` define logo, cores, ícones por tenant.

### Isolamento
- Toni Pizzeria, Template Restaurant e qualquer outro tenant carregam apenas o próprio branding/menu/config.
- Domínio inexistente → `DomainNotConfiguredScreen` (sem fallback automático).

---

## 5. PropioApp Master vs PWA vs App Nativo

| Dimensão | Master | PWA (Standard) | App Nativo (Premium) |
|---|---|---|---|
| Função | Plataforma SaaS | Loja online do restaurante | Loja em app instalável nas stores |
| URL | `/`, `/admin` | `custom_domain` ou `master/<slug>` | App nas stores apontando para tenant |
| Publicação stores | Sim, app PropioApp único | Não | Sim, 1 app por tenant premium |
| Status hoje | ✅ Pronto | ✅ Pronto | 🟡 Schema pronto, build manual futuro |
| Branding | PropioApp | Por tenant | Por tenant |

---

## 6. Como Criar um Restaurante Novo

1. Admin Master → `/admin/tenants/new` (wizard).
2. Define: nome, slug, `custom_domain` opcional, plano, idiomas.
3. Trigger cria automaticamente:
   - 1 store default
   - `company_settings` default
   - `totem_config` default
   - `tenant_app_distribution` default (pwa/active)
   - Linhas em `store_payment_gateways` (todas `disabled`)
4. Admin Master ajusta branding, menu, gateways e (se premium) dados de distribuição.

---

## 7. Como Controlar Distribuição

- `/admin/distribution` — visão geral de todos tenants (tipo, PWA, Android, iOS).
- `/admin/distribution/:tenantId` — edição: tipo, package id, bundle id, URLs, ícone, splash, screenshots.
- `/admin/build-center` — registro manual de builds (nenhum build real é executado).
- `/admin/release-center` — datas, versões e links Play Console / App Store Connect.

---

## 8. Status Stripe

- 🟢 Catálogo de gateways (`payment_gateways`) seedado: stripe, redsys, bizum.
- 🟢 `store_payment_gateways` populado por trigger, sempre `disabled` por padrão.
- 🟢 UI `/admin/payments` lista status por store/gateway.
- 🟡 Edge functions Connect existem (`stripe-connect-onboard`, env `_shared/stripeEnv.ts`).
- 🔴 Stripe Connect real **não ativado**: faltam onboarding por store, validação `charges_enabled`, split da plataforma, webhooks live.
- 🔴 Pagamentos reais **bloqueados** até onboarding completo.

---

## 9. Status PWA

- 🟢 Manifest dinâmico via edge function `tenant-manifest` por hostname.
- 🟢 Branding por tenant (`company_settings`: logo, cores, ícones 192/512).
- 🟢 `tenants.custom_domain` + `path_slug` + `master_domain` funcionais.
- 🟢 Service worker base presente.
- 🟡 Push notifications: estrutura existe (`push_subscriptions`, `platform_push_config`), validação por tenant a confirmar.

---

## 10. Status Apps Nativos

- 🟢 Schema completo (`tenant_app_distribution`, `tenant_app_builds`).
- 🟢 UI admin completa (Distribuição, Build Center, Release Center).
- 🟢 Capacitor configurado no projeto (`capacitor.config.ts`, pasta `android/`).
- 🔴 Nenhum build automatizado por tenant.
- 🔴 Nenhuma publicação real em Play Store / App Store.
- 🔴 Sem geração dinâmica de `capacitor.config.ts` por tenant.
- 🔴 Sem pipeline CI por tenant premium.

---

## 11. Próximos Passos Recomendados

Por prioridade:

1. **Validar e ativar Stripe Connect (sandbox)**
   - Onboarding por store (`stripe-connect-onboard`).
   - Validar `charges_enabled` + `onboarding_completed`.
   - Webhooks de teste.
   - Definir % de split da plataforma em `platform_settings`.

2. **Hardening RLS**
   - Revisar policies de todas tabelas novas com testes por papel (admin_master, restaurant_admin, operator, kitchen).

3. **Push notifications por tenant**
   - Confirmar que cada PWA registra com chave VAPID correta e isola subscriptions por tenant.

4. **Fase D real (apps nativos)** — somente após Stripe estar verde
   - Script gerador de `capacitor.config.ts` por tenant.
   - Pipeline CI manual por tenant premium.
   - Upload de assets para Storage `tenant-app-assets/{tenant_id}/`.

5. **Fase E real** — submissões e tracking
   - Preenchimento de versão/data após cada release.
   - Histórico em `tenant_app_builds`.

6. **Operacional**
   - Auditoria de impressão multi-tenant.
   - Auditoria de KDS multi-tenant.
   - Métricas globais no `/admin` (ranking, faturamento, MRR por plano).

**Bloqueios mantidos:** Stripe Live, Apple Connect real, Google Play real, Capacitor build real, publicação automática, DNS automático.

---

## 12. Resumo Executivo

| Camada | Status |
|---|---|
| Multi-tenant resolução | ✅ Estável |
| Isolamento de dados (RLS) | ✅ Aplicado |
| Branding por tenant | ✅ Funcional |
| Gateways de pagamento (catálogo + estado) | ✅ Pronto |
| Stripe Connect real | 🔴 Pendente |
| PWA por tenant | ✅ Pronto |
| App nativo por tenant | 🟡 Schema + UI prontos, build real pendente |
| Painel master de distribuição | ✅ Pronto |

A base SaaS está consolidada. O próximo marco crítico é Stripe Connect sandbox ponta-a-ponta antes de qualquer build nativo real.