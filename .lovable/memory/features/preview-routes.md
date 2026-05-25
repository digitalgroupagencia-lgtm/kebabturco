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

## Regras do projecto

- Só existem 4 ficheiros em `src/pages/` (loja, login, instalar, erro).
- Painel, admin e vendedor vivem em `src/views/` — **não** são páginas soltas no preview.
- Não usar wildcards (`/*`) nem paths multi-cliente SnapOrder.
- Se o selector ainda mostrar entradas antigas: **Definições → Git → GitHub → sincronizar a branch main** e depois publicar.
