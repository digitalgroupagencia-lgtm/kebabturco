# Rotas do preview Lovable (Kebab Turco único)

O selector de páginas do preview deve listar **apenas** estas 2 entradas (literais em `src/App.tsx`):

- `/` — loja (cliente)
- `/auth` — login

**Não** incluir `/panel`, `/admin`, `/delivery` nem `/seller` no dropdown — exigem login e deixam o preview em branco.

Todas as outras páginas funcionam via navegação interna (catch-all `*`) — **não** aparecem no dropdown.

## Regras

- Só 2 `<Route path="...">` literais em `src/App.tsx` + catch-all `*`.
- **Nunca** recriar `src/pages/panel/`, `src/pages/admin/` ou `src/pages/seller/`.
- **Nunca** wildcards (`/*`, `/:tenantPath`, `/admin/tenants/:slug/*`).
- **Nunca** adicionar rotas literais extra em App.tsx (o scanner Lovable lista cada uma no selector).
- Navegação no código: `nav.panel()`, `nav.admin()`, `nav.delivery()`, `nav.seller()`.

## Se o selector ainda mostrar rotas antigas

1. GitHub → Sync branch `main`
2. Publish
3. Cache do editor — aguardar ou reabrir projecto
