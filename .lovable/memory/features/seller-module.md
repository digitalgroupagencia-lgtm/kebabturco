---
name: Módulo Vendedor / Garçom
description: App mobile /seller, gestão de mesas, fechamento individual e total, cobrança por vendedor extra
type: feature
---
# Módulo Vendedor (entrega completa)

## Rotas
- `/seller` — Início (resumo do dia)
- `/seller/tables` — Lista de mesas abertas
- `/seller/tables/:sessionId` — Detalhe da mesa (clientes, fechamento individual e total)
- `/seller/new?table=&customer=` — Novo pedido (mesa + cliente + cardápio)
- `/seller/my-orders` — Histórico 7d

## Permissões
- `seller` só vê `/seller/*`. Login redireciona automaticamente.
- Restaurante gerencia em `/panel/sellers`. Admin Master define limites em `tenant_subscriptions`.

## Cobrança automática
`get_tenant_billing(tenant_id)` retorna `monthly_total = monthly_amount + max(sellers_allowed - sellers_included, 0) * extra_seller_price`.

## RPCs
- `create_seller_order(store_id, table_number, customer_name, items jsonb, notes)` — cria pedido + items + atualiza totais da mesa/cliente.
- `open_or_get_table_session`, `add_or_get_table_customer`
- `get_table_session_detail(session_id)` — clientes da mesa
- `close_table_customer(customer_id, payment_method)` — fecha um cliente
- `close_table_session_unified(session_id, payment_method)` — fecha mesa toda (pagamento único)
- Modo "dividido": chama `close_table_customer` para cada cliente com método próprio
- `get_seller_report(store_id, since)` — pedidos/faturamento/ticket por vendedor

## Tabelas
- `tables`, `table_sessions`, `table_session_customers`
- `orders.seller_id / table_session_id / table_customer_id`
- `tenant_subscriptions.setup_fee, sellers_included, sellers_allowed, extra_seller_price`

## Impressão
`print-order` é chamada no envio do pedido pelo vendedor (mesa, cliente nos cabeçalhos).
