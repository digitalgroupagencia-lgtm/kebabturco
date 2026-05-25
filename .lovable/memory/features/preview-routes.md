# Rotas do preview Lovable (Kebab Turco único)

O selector de páginas do preview deve listar **apenas** estas entradas (declaradas em `src/App.tsx`):

- `/` — loja
- `/auth` — login
- `/panel` — pedidos
- `/panel/menu` — cardápio
- `/panel/cashier` — caixa
- `/panel/modifiers` — personalização
- `/panel/branding` — identidade
- `/panel/banners` — banners
- `/panel/delivery-zones` — zonas de entrega
- `/panel/payments` — pagamentos
- `/admin` — administração
- `/admin/routes` — mapa de endereços
- `/admin/plans` — planos
- `/cashier` — atalho caixa
- `/seller` — vendedor

## Regras do projecto

- Só existem **4 ficheiros** em `src/pages/` (`Index`, `Auth`, `Install`, `NotFound`).
- **Nunca** recriar `src/pages/panel/`, `src/pages/admin/` ou `src/pages/seller/` — a Lovable indexa essa pasta.
- Rotas literais do dropdown: **só** em `src/App.tsx` (paths absolutos, sem nested relativos).
- Outras páginas (`/install`, `/panel/stock`, `/seller/tables`, centrais admin) → `CatchAllResolver` **sem** `<Route path={variável}>`.
- Navegação no código: `nav.panel()`, `nav.admin()`, `nav.seller()` — sem strings `"/panel/..."` literais.
- Não usar wildcards (`/*`) nem paths multi-cliente SnapOrder.

## Se o selector ainda mostrar lixo antigo

1. **Definições → Git → GitHub → sincronizar branch `main`**
2. **Publicar**
3. Entradas antigas = **cache do editor** até sync com o commit mais recente
