# Rotas do preview Lovable (Kebab Turco único)

O selector de páginas do preview deve listar apenas estes endereços:

- `/` — loja
- `/auth` — login
- `/install` — instalar app
- `/cashier` — atalho caixa
- `/panel` — painel restaurante
- `/panel/menu` — cardápio
- `/panel/cashier` — caixa
- `/admin` — administração
- `/admin/routes` — mapa de endereços
- `/admin/plans` — planos

Endereços legados SnapOrder (`/admin/tenants`, `/:tenantPath`, `/admin/*`, `/preview/...`) foram removidos do código. Se ainda aparecerem no selector, sincronizar de novo a partir do GitHub e publicar.

Todas as definições de navegação vivem em `src/routes/AppRoutes.tsx`. Os ficheiros `*RouteConfig.ts` não contêm elementos Route.
