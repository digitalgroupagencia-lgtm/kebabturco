## Simulador de Pedidos — Admin Master

Ferramenta profissional dentro do Admin Master para validar todo o fluxo operacional (impressão, push, som, vibração, painéis) sem criar pedidos reais.

### Localização

`Admin Master → Ferramentas → Simulador de Pedidos` (nova rota `/admin/tools/order-simulator`).

### Marcação de pedidos de teste

Adicionar coluna `is_test BOOLEAN DEFAULT false` na tabela `orders` via migração. Todo pedido criado pelo simulador grava `is_test = true` e `notes` começando com `[TESTE]`.

**Exclusão de métricas:** atualizar todas as funções/queries de relatório para filtrar `is_test = false`:

- `get_sales_summary`, `get_top_products`, `get_hourly_sales`, `get_admin_dashboard_stats`, `get_top_tenants_by_revenue`, `get_tenant_monthly_usage`
- Páginas: `Dashboard`, `ReportsPage`, `PanelFinancePage`, `FinancePage`, `CashierPage` (qualquer consulta direta a `orders` para totais)
- Estoque: o trigger `deduct_stock_on_order_item` passa a sair cedo quando o pedido pai tem `is_test = true`
- Ledger Stripe: pedidos teste nunca tocam `store_payment_ledger` (já não entram por não serem pagos via Stripe real)

Pedidos teste **continuam** entrando em: lista de pedidos ao vivo, KDS, painel operador, painel entregador, impressão, push, sons — para validar o fluxo.

### UI da página

Card de seleção de loja (admin master escolhe a loja onde os testes vão rodar — usa `AdminStoreContext` ou seletor próprio).

Cinco blocos com botão grande e descrição curta:

1. **Pedido Teste — Mesa**
  - Selector de mesa (carrega `tables` da loja)
  - Botão "Enviar Pedido Teste – Mesa"
2. **Pedido Teste — Balcão** (takeaway)
  - Botão único
3. **Pedido Teste — Delivery**
  - Botão único; usa endereço fake (`Rua Teste 123, Cidade Teste`) e a primeira `delivery_zone` ativa da loja
4. **Testar Notificações** (não cria pedido)
  - Chama edge function `send-push-notification` com payload de teste + dispara som/vibração local via `panelAlerts`
5. **Simulação Completa Automática**
  - Cria pedido delivery teste
  - Avança status a cada N segundos (configurável, default 5s): `pending → preparing → ready → out_for_delivery → delivered`
  - Log visual em tempo real do progresso

Banner permanente no topo: "Pedidos de teste aparecem com a tag [TESTE] e não entram em métricas/faturamento."

### Visual diferenciado

Cards de pedido (`OpsOrderCard`, KDS, painel) detectam `is_test` e adicionam:

- Badge amarelo "[TESTE]" no topo
- Borda tracejada amarela (`border-dashed border-yellow-400`)
- Tooltip "Pedido de teste — não conta em métricas"

### Edge function

Nova função `simulate-test-order` (server-side) que:

- Valida que o caller é `admin_master`
- Recebe `{ storeId, mode: 'dine_in'|'takeaway'|'delivery', tableId? }`
- Pega 1-2 produtos aleatórios ativos da loja
- Insere direto em `orders` + `order_items` com `is_test = true`, `payment_status = 'paid'` (não passa por Stripe), `notes = '[TESTE] Pedido de teste do sistema.'`
- Retorna o `order_id` criado
- O trigger `trg_orders_staff_push` já dispara push automaticamente

Função auxiliar `advance-test-order-status` para o modo "Simulação Completa" (avança um status).

### Permissões

Toda a página e edge functions exigem `has_role(auth.uid(), 'admin_master')`. Operadores comuns nunca veem nem disparam.

### Arquivos

**Novos:**

- `supabase/migrations/<ts>_orders_is_test.sql` — adiciona coluna + atualiza RPCs
- `supabase/functions/simulate-test-order/index.ts`
- `supabase/functions/advance-test-order-status/index.ts`
- `src/views/admin/OrderSimulatorPage.tsx`
- `src/components/admin/simulator/SimulatorCard.tsx`
- `src/components/admin/simulator/TestOrderBadge.tsx`

**Editados:**

- `src/routes/AppRoutes.tsx` (+ registry) — registrar rota
- Sidebar do Admin Master — link "Ferramentas → Simulador de Pedidos"
- `src/features/ops/OpsOrderCard.tsx` + KDS card — render do badge `[TESTE]`
- `src/integrations/supabase/types.ts` — regenerado após migration

### Notas técnicas

- O simulador **não** chama Stripe; marca `payment_status = 'paid'` direto para não travar fluxo
- A migração filtra `is_test` em todos os agregados existentes mantendo assinatura das funções
- Para "Testar Notificações" sem pedido, chamamos `send-push-notification` direto com `audience='staff'` + `storeId`, e localmente disparamos `panelAlerts.playNewOrderAlert()` para o som/vibração imediatos  
  
só acrescentaria 4 melhorias para evitar problemas futuros:
  ### 1. Limpeza automática dos pedidos teste
  Adicionar:
  > Criar botão "Limpar Todos os Pedidos de Teste" que remove automaticamente todos os pedidos com `is_test = true`.
  >
  > Também adicionar limpeza automática após 7 dias para evitar acúmulo de registros desnecessários no banco.
  ---
  ### 2. Teste específico da impressora
  Hoje você só testa o pedido completo.
  Adicionar:
  > Botão "Testar Impressora".
  >
  > Deve imprimir imediatamente um ticket padrão de diagnóstico contendo:
  >
  > - Nome da loja
  > - Data e hora
  > - Modelo da impressora
  > - Endereço IP da impressora
  > - Texto "IMPRESSÃO DE TESTE"
  >
  > Sem criar pedido.
  Isso ajuda quando o restaurante fala:
  > "Não sei se o problema é a impressora ou o pedido."
  ---
  ### 3. Teste específico do entregador
  Adicionar:
  > Botão "Simular Entregador".
  >
  > Cria pedido delivery teste e envia imediatamente para o painel do entregador.
  >
  > Deve gerar:
  >
  > - Código de confirmação
  > - Notificação do entregador
  > - Fluxo de aceite
  > - Fluxo de entrega
  Porque delivery costuma ser o ponto mais difícil de validar.
  ---
  ### 4. Painel de diagnóstico
  Essa é a melhoria mais importante.
  Adicionar uma seção:
  # Diagnóstico do Sistema
  Mostrar em tempo real:
  ✅ Impressora conectada
  ✅ Push configurado
  ✅ Firebase conectado
  ✅ Operador online
  ✅ Cozinha online
  ✅ Entregador online
  ✅ Som habilitado
  ✅ Vibração habilitada
  ✅ Permissão de notificação concedida
  ✅ Tablet em Keep Awake
  Última impressão: 21:44
  Último push enviado: 21:45
  Último pedido recebido: 21:46
  ---
  Com isso você transforma o simulador em uma ferramenta de suporte.
  Quando um restaurante disser:
  > "Não está chegando pedido"
  Você entra no Admin Master e em 10 segundos sabe exatamente se o problema é:
  - impressora
  - internet
  - push
  - operador offline
  - entregador offline
  - Firebase
  - permissão do tablet
  Sem precisar ficar investigando manualmente.