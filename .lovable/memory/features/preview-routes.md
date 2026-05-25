# Rotas do preview Lovable (Kebab Turco único)

O selector de páginas do preview deve listar **apenas** estas entradas (declaradas em `src/App.tsx`):

- `/` — loja
- `/auth` — login
- `/panel` — pedidos (operação)
- `/panel/cashier` — caixa
- `/admin` — administração do projecto
- `/admin/menu` — cardápio
- `/admin/branding` — identidade
- `/admin/operations` — pagamentos
- `/admin/routes` — mapa de endereços
- `/admin/plans` — planos
- `/cashier` — atalho caixa
- `/seller` — vendedor

## Separação painel vs admin

- **`/panel`** — só operação diária (pedidos, caixa, mesas, equipa, vendedores, guia, diagnóstico).
- **`/admin`** — configuração completa (cardápio, identidade, banners, pagamentos, etc.).
- URLs antigas `/panel/menu`, `/panel/branding`, … → bloqueadas; admin_master vai para `/admin/...`; equipa do restaurante volta a `/panel`.

## Regras do projecto

- Só existem **4 ficheiros** em `src/pages/` (`Index`, `Auth`, `Install`, `NotFound`).
- **Nunca** recriar `src/pages/panel/`, `src/pages/admin/` ou `src/pages/seller/` — a Lovable indexa essa pasta.
- Rotas literais do dropdown: **só** em `src/App.tsx` (paths absolutos, sem nested relativos).
- Outras páginas (`/install`, `/panel/dashboard`, `/admin/coupons`, `/seller/tables`, centrais admin) → `CatchAllResolver` **sem** `<Route path={variável}>`.
- Navegação no código: `nav.panel()`, `nav.admin()`, `nav.seller()` — sem strings `"/panel/..."` literais.
- Não usar wildcards (`/*`) nem paths multi-cliente SnapOrder.

## Se o selector ainda mostrar lixo antigo

1. **Definições → Git → GitHub → sincronizar branch `main`**
2. **Publicar**
3. Entradas antigas = **cache do editor** até sync com o commit mais recente
