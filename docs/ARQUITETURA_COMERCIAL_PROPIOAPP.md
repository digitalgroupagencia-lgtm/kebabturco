# Arquitetura Comercial PropioApp

Documento oficial dos 3 modelos de distribuição suportados pela plataforma.
Última atualização: Fase de planejamento (pré-Stripe Connect real).

---

## 1. PropioApp — App / Plataforma Master

PropioApp é o produto principal: aplicativo institucional + painel SaaS de
gestão de todos os restaurantes clientes.

**Funções:**
- `/` → landing institucional (`PropioLanding`)
- `/admin` → painel master (admin_master)
- Gestão de tenants, planos, pagamentos, métricas globais
- Ranking de restaurantes, faturamento, status por restaurante
- Gestão de domínios, PWAs e (futuro) apps nativos por tenant

**Distribuição:** publicado nas lojas (Apple Store / Google Play) como app
master da empresa PropioApp. **Não** representa um restaurante específico.

---

## 2. Restaurante PWA — Plano Standard

Cada restaurante recebe um PWA isolado, sem publicação em loja.

**Identidade própria:** domínio, slug, branding, ícone, splash, cardápio,
pedidos, gateway de pagamento.

**Exemplos:**
- `kebabturco.es` (custom_domain)
- `tonipizzeria.es` (custom_domain)
- `propioapp.es/toni-pizzeria` (master_domain + path_slug)

**Não exige** publicação individual em Apple Store / Google Play.

---

## 3. Restaurante App Nativo — Plano Premium

Cada restaurante premium pode ter app próprio nas lojas, compartilhando o
mesmo backend multi-tenant.

**Requisitos por app:** nome, ícone, bundle id iOS, package id Android,
splash, screenshots, URL inicial apontando para o tenant, configuração de
loja própria.

**Status:** não implementado. Apenas planejado.

---

## Auditoria da Estrutura Atual

### ✅ Já suportado
| Capacidade | Onde |
|---|---|
| App master PropioApp | `RootRoute` + `PropioLanding` + `/admin` |
| PWA por tenant via custom_domain | `tenants.custom_domain` + `useResolvedStore` |
| PWA por tenant via subpath | `tenants.path_slug` + `tenants.master_domain` + `tenants.use_master_domain` |
| Resolução por slug `/toni-pizzeria` | `useResolvedStore` (firstSeg) |
| Manifest dinâmico por host | edge function `tenant-manifest` |
| Branding por tenant | `company_settings` (logo, cores, ícones 192/512) |

### ❌ Faltando para app nativo por tenant
Nenhum dos campos abaixo existe hoje em `tenants` nem em uma tabela dedicada:

| Campo necessário | Finalidade |
|---|---|
| `distribution_type` (`pwa` \| `native_app`) | Diferencia plano Standard vs Premium |
| `pwa_status` (`draft`\|`active`\|`disabled`) | Saúde do PWA |
| `android_app_status` (`none`\|`draft`\|`in_review`\|`published`\|`rejected`) | Status Play Store |
| `ios_app_status` (idem) | Status App Store |
| `android_package_id` | ex. `app.propio.tonipizzeria` |
| `ios_bundle_id` | ex. `app.propio.tonipizzeria` |
| `native_app_start_url` | URL inicial dentro do WebView/Capacitor |
| `native_app_icon_url` | Ícone 1024×1024 para stores |
| `native_app_splash_url` | Splash para stores |
| `native_app_screenshots` (jsonb[]) | Screenshots por device |
| `android_play_console_url` | Link de gestão |
| `ios_appstore_connect_url` | Link de gestão |
| `android_published_at` / `ios_published_at` | Datas de publicação |
| `android_version` / `ios_version` | Versão atual nas lojas |

Observação: `tenants` já possui `custom_domain` (domínio principal), então
esse campo não precisa ser adicionado.

### Tabelas auxiliares recomendadas (futuro)
- `tenant_app_distribution` — 1:1 com `tenants`, agrupa todos os campos
  acima. Mantém `tenants` enxuto e permite RLS específica para o módulo
  de publicação.
- `tenant_app_release_history` — log de submissões/aprovações por loja
  (versão, store, status, data, motivo de rejeição).
- `tenant_app_assets` — biblioteca de ícones/splash/screenshots versionada.

---

## Plano Seguro de Adoção (sem implementar agora)

**Fase A — Schema (uma migration, sem código novo)**
1. Criar enum `app_distribution_type` (`pwa`, `native_app`).
2. Criar enum `app_store_status` (`none`, `draft`, `in_review`, `published`, `rejected`, `disabled`).
3. Criar tabela `tenant_app_distribution` (1:1 com `tenants`), com GRANTs + RLS (`admin_master` total; `restaurant_admin` leitura do próprio tenant).
4. Trigger para criar linha default `distribution_type='pwa'` ao inserir tenant.

**Fase B — Painel Master (somente leitura)**
1. Aba "Distribuição" em `AdminTenants`: lista status PWA/Android/iOS por tenant.
2. Sem edição ainda.

**Fase C — Edição manual no Admin Master**
1. Formulário para preencher bundle/package id, URLs, ícones.
2. Upload de assets para Storage (`tenant-app-assets/{tenant_id}/...`).

**Fase D — Geração assistida do build nativo (Capacitor)**
1. Script que lê `tenant_app_distribution` e gera `capacitor.config.ts` por tenant.
2. CI separado por tenant premium.
3. **Sem** automação de submissão às lojas — sempre manual.

**Fase E — Submissão e tracking**
1. Campos de versão/data preenchidos manualmente após cada release.
2. Histórico em `tenant_app_release_history`.

---

## Restrições Atuais (não violar)
- Não gerar app nativo automaticamente ainda.
- Não mexer em Apple Store / Google Play.
- Não mexer em Android/iOS no código.
- Não implementar Stripe Connect real ainda.
- Não alterar checkout, pedidos, impressão, KDS ou dashboard.

---

## Resumo
- **Modelo 1 (Master):** ✅ pronto.
- **Modelo 2 (PWA por tenant):** ✅ pronto (com `tenant-manifest` + branding).
- **Modelo 3 (App nativo por tenant):** ❌ requer schema novo (Fase A) antes de qualquer código. Plano em 5 fases acima.