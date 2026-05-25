# Rotas do preview Lovable (Kebab Turco único)

O selector de páginas do preview deve listar **apenas**:

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
- `/seller` — área vendedor

## Regras do projecto

- Só existem **4 ficheiros** em `src/pages/` (`Index`, `Auth`, `Install`, `NotFound`).
- **Nunca** recriar `src/pages/panel/`, `src/pages/admin/` ou `src/pages/seller/` — a Lovable indexa essa pasta e mostra dezenas de rotas fantasma.
- Painel, admin e vendedor vivem em `src/views/` — rotas internas via `navPaths.ts` + `CatchAllResolver`.
- Rotas literais do preview: **só** em `src/routes/AppRoutes.tsx`.
- Não usar wildcards (`/*`) nem paths multi-cliente SnapOrder.
- Endereços de navegação: usar `nav.panel()`, `nav.admin()`, `nav.seller()` — evitar strings `"/panel/..."` no código.

## Se o selector ainda mostrar lixo antigo

1. **Definições → Git → GitHub → sincronizar branch `main`**
2. **Publicar** de novo
3. Abrir `/admin/routes` manualmente na barra de endereços do preview
4. Entradas antigas podem ser **cache do editor** — desaparecem após sync com commit que apagou `src/pages/admin|panel|seller`
