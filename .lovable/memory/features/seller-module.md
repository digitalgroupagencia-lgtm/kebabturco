---
name: Módulo Vendedor / Garçom
description: App mobile vendedor — rotas explícitas (sem wildcards)
type: feature
---
# Módulo Vendedor (Kebab Turco único)

## Rotas reais (sem `/*`)
- `/seller` — Início (resumo do dia)
- `/seller/tables` — Mesas abertas (navegação interna, não no dropdown Lovable)
- `/seller/tables/:sessionId` — Detalhe da mesa
- `/seller/new` — Novo pedido
- `/seller/my-orders` — Histórico

## Dropdown Lovable
Só `/seller` aparece no selector. As restantes são acessíveis pelos botões dentro da app.

## Permissões
- Perfil `seller` entra na área vendedor após login.
- Restaurante gere vendedores em `/panel/sellers`.

## Não usar (legado SnapOrder)
- `/seller/*` como rota
- `/admin/tenants/:slug/*`
- `/:tenantPath`
