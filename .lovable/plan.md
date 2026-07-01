Vou corrigir o problema na origem: o trigger do backend que sincroniza pedidos com o Flow está a tentar inserir o mesmo evento duas vezes na fila `flow_webhook_queue`, causando o erro `duplicate key value violates unique constraint "uq_flow_queue_order_event"`. Isso bloqueia a mudança de estado do pedido no painel.

Plano de correção:

1. Atualizar a função de backend `enqueue_wgm_order_sync`
   - Trocar o insert simples por um comportamento seguro de “criar ou reutilizar”.
   - Se já existir fila para o mesmo `order_id + event_type`, ela será reativada como `pending` em vez de gerar erro.
   - Limpar `attempts`, `last_error` e `sent_at` quando for reprocessar.

2. Atualizar o trigger `trg_orders_wgm_sync`
   - Garantir que qualquer erro da fila/sincronização externa não bloqueia o painel do restaurante.
   - O pedido deve avançar normalmente para “Listo para entrega” mesmo se o envio para o Flow falhar momentaneamente.
   - O erro ficará apenas como aviso interno, sem aparecer como erro no botão.

3. Verificar integridade da fila existente
   - Confirmar se existem duplicados antigos em `flow_webhook_queue`.
   - Se existirem, limpar antes de reforçar a lógica.

4. Validar depois da migration
   - Confirmar no banco que as funções novas ficaram aplicadas.
   - Validar que o botão “Marcar listo” deixa de disparar o erro `uq_flow_queue_order_event`.

Resultado esperado:

- O botão “Marcar listo” volta a funcionar.
- O pedido avança para a próxima etapa no painel ao vivo.
- A sincronização com o Flow não quebra a operação do restaurante.
- O toast de erro mostrado nas imagens deixa de aparecer.