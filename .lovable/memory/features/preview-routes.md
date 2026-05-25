# Rotas do preview Lovable (Kebab Turco único)

O selector de páginas do preview deve listar **apenas** estas 3 entradas (literais em `src/App.tsx`):

- `/` — loja
- `/auth` — login
- `/panel` — pedidos (operação)

Todas as outras páginas (`/admin`, `/panel/cashier`, `/seller`, etc.) funcionam via navegação interna — **não** aparecem no dropdown.

## Regras

- Só 3 `<Route path="...">` literais em `src/App.tsx` + catch-all `*`.
- **Nunca** recriar `src/pages/panel/`, `src/pages/admin/` ou `src/pages/seller/`.
- **Nunca** wildcards (`/*`, `/:tenantPath`, `/admin/tenants/:slug/*`).
- Navegação no código: `nav.panel()`, `nav.admin()`, `nav.seller()`.

## Se o selector ainda mostrar rotas antigas

1. GitHub → Sync branch `main`
2. Publish
3. Cache do editor — aguardar ou reabrir projecto
