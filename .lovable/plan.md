## Objetivo
Gerar um único arquivo `.sql` com `INSERT INTO` de **todos os dados** do projeto atual, pronto para colar num remix novo e replicar 100% (layout, imagens via URL, posicionamentos, configs, produtos, modificadores, etc).

## Tabelas a exportar (na ordem correta de dependência)

1. `tenants`
2. `stores`
3. `company_settings`
4. `operations_settings`
5. `totem_config`
6. `splash_media`
7. `promo_banners`
8. `delivery_zones`
9. `categories`
10. `products`
11. `product_sizes`
12. `product_extras`
13. `product_stock` (se houver dados)
14. `stock_items`
15. `printer_settings` / `printers` / `printer_category_map`
16. `tables`
17. `coupons`
18. `platform_plans` / `platform_features` / `plan_features`
19. `tenant_plan_assignments` / `tenant_feature_overrides`
20. `tenant_subscriptions`

> Observação: as tabelas `modifier_groups`, `modifiers`, `product_modifiers`, `extras`, `sizes`, `site_branding`, `payment_policy` que você citou **não existem** no schema atual. Os modificadores hoje vivem dentro de `products` (campo JSON) + `product_sizes` + `product_extras`. O branding vive em `company_settings` + `totem_config`. As regras de pagamento ficam em `operations_settings`. Vou incluir tudo isso.

## Como vou gerar

1. Para cada tabela, rodo `SELECT * FROM <tabela>` e converto cada linha num `INSERT INTO ... VALUES (...)` com escaping correto (strings, JSONB, arrays, UUIDs, timestamps, nulls).
2. Cabeçalho do arquivo: `BEGIN;` + `SET session_replication_role = replica;` (desativa triggers/FKs durante a importação) e no fim `SET session_replication_role = DEFAULT; COMMIT;`.
3. Cada bloco com comentário `-- ===== <tabela> (N linhas) =====`.
4. Uso `ON CONFLICT (id) DO NOTHING` em todas as tabelas com PK `id`, para o script poder ser reexecutado.
5. Imagens: ficam como URLs (Lovable Cloud Storage). Funcionam direto no remix sem precisar re-upload — desde que o novo projeto consiga acessar as URLs públicas atuais (e conseguirá, pois o bucket é público).
6. Salvo em `/mnt/documents/export-completo.sql` e disponibilizo via `<presentation-artifact>` para download.

## O que **não** vai no export (de propósito)

- `auth.users`, `user_roles`, `staff_access_pins`, `profiles` → contas/senhas/PINs não devem ser migrados (segurança). No remix você cria a conta admin nova.
- `orders`, `order_items`, `cash_registers`, `payment_history`, `store_payouts`, `store_payment_ledger`, `loyalty_accounts`, `print_jobs`, `push_subscriptions`, `table_sessions` → dados transacionais, não fazem sentido no remix.
- Configs do Stripe Connect (account IDs) → ficam vazias no remix, você reconfigura.

Se quiser incluir algum desses, me diga antes de executar.

## Próximo passo

Confirma e eu rodo o script — entrego o `.sql` pronto para colar no SQL Editor do remix.