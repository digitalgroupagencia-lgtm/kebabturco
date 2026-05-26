# Memory: index.md

# Project Memory

## Core
Kebab Turco — **loja única** (não é plataforma multi-cliente SnapOrder).
Totem + Painel Restaurante + Administração + Vendedor.
Primary #D62300, CTA #28A745, accent #FFC72C, bg #FFFFFF.
Nunito font. Touch-first, botões mínimo 48px.
Lovable Cloud ativo. Multi-idioma (pt/en/es/fr) com JSONB.
Roles: admin_master, restaurant_admin, operator, kitchen, seller.
Usuário prefere instruções simples, sem edição manual. Fala português.

## Preview Lovable (dropdown de páginas)
**Só** estas 2 entradas — literais em `src/App.tsx`:
`/` · `/auth`

**Nunca** `/panel`, `/admin`, `/delivery` no dropdown (preview fica em branco).
**Nunca** recriar `src/pages/panel/`, `src/pages/admin/` ou `src/pages/seller/`.
**Nunca** usar wildcards (`/*`, `/:tenantPath`, `/admin/tenants/:slug/*`).
**Nunca** adicionar `<Route path="...">` extra em App.tsx — o scanner Lovable lista cada uma.

## Integrações
- **Google Maps:** desligado — ver [Integrações](mem://features/integrations)
- [Regras Kebab Turco](mem://features/kebab-rules) — Delivery, modificadores, impressão
- [Rotas do preview](mem://features/preview-routes) — Lista curada do dropdown
- [Módulo Vendedor](mem://features/seller-module) — App vendedor, mesas, pedidos
- [Conhecimento do Assistente IA](mem://features/assistant-knowledge) — Atualizar SYSTEM_PROMPT a cada mudança
