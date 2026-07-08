## O que os logs mostram

- O PDF mostra a falha principal da Live Activity: `Push-to-start budget exceeded ... not starting activity`.
- O backend está a enviar `event: start` da Live Activity repetidamente para o mesmo pedido 0004, minuto a minuto.
- Não existe nenhum token `activity_update` registado para o pedido. Só existe `push_to_start`.
- Sem `activity_update`, o backend não consegue atualizar tempo/estado nem encerrar o cartão remotamente; por isso insiste em novo `start` até o iPhone bloquear por orçamento.
- O PDF também mostra `inputs: []` no start da Live Activity, ou seja, o payload não está a pedir token de atualização no arranque remoto.
- Não há logs da função `accept-order-from-live-activity`, então o toque no botão ACEITAR não chegou ao servidor.

## Plano de correção

1. **Live Activity voltar a aparecer de forma estável**
  - Manter `APNS_USE_SANDBOX` como está.
  - Manter os pushes normais repetidos.
  - Alterar só o payload da Live Activity para, no `start`, pedir token de atualização com `input-push-token`.
  - Assim, depois do primeiro cartão criado, o iPhone devolve um token próprio para atualizar/encerrar esse cartão.
2. **Registar automaticamente o token de atualização da Live Activity**
  - No código nativo iOS, observar também as Live Activities criadas por push remoto.
  - Quando o iPhone receber uma Live Activity nova, enviar automaticamente o `activity_update` token para o backend.
  - Isto corrige a raiz do problema: pedido pendente passa a ter 1 cartão grande ativo e atualizável.
3. **Não reenviar `start` quando já existe cartão ativo**
  - Depois de existir `activity_update`, os alertas repetidos continuam a mandar push normal com som.
  - A Live Activity deixa de receber vários `start` e passa a receber `update`.
  - O tempo de espera passa a atualizar pelo próprio widget e por updates quando necessário.
4. **Botão ACEITAR PEDIDO da Live Activity**
  - Garantir que o payload da Live Activity contém `orderId`, `storeId`, `acceptUrl`, `acceptToken` e chave pública.
  - Adicionar logs nativos claros para: botão tocado, pedido recebido, resposta do servidor.
  - Ao aceitar com sucesso: mudar pedido para “A preparar”, encerrar Live Activity e parar alertas repetidos.
5. **Botão ACEITAR no push normal iOS**
  - Criar categoria nativa de notificação com ações “Aceitar” e “Abrir”.
  - Enviar no push normal os dados necessários do pedido.
  - Quando tocar em “Aceitar”, o app chama o backend e aceita o pedido; se não conseguir, abre direto `/panel/live?order={order_id}`.
6. **Tocar no corpo da notificação**
  - Implementar handler nativo iOS confiável para toque na notificação, inclusive app fechada/fria.
  - Tocar no corpo nunca aceita automaticamente.
  - Deve abrir direto: `/panel/live?order={order_id}`.
7. **Parar alertas quando pedido é cancelado/aceite noutro dispositivo**
  - Ao detectar pedido que deixou de estar `pending`, limpar alerta local desse pedido automaticamente.
  - Ao cancelar ou aceitar no painel, disparar encerramento remoto da Live Activity quando houver token de update.
  - Adicionar proteção para não continuar som local se o pedido já não está pendente.
8. **Logs obrigatórios**
  - Backend: payload real do push normal, payload real da Live Activity, start/update/end, token update registado, resposta APNs.
  - iOS: notificação tocada, ação tocada, deep link recebido, order_id recebido, rota aberta, botão aceitar tocado, resposta do servidor.

## Resultado esperado

- Push normal repetido continua a chegar com som enquanto o pedido está pendente.
- Live Activity grande aparece uma vez por pedido e é atualizada, não recriada.
- O tempo corre corretamente.
- ACEITAR PEDIDO muda para “A preparar”.
- Cancelar/aceitar em qualquer dispositivo para os alertas e remove a Live Activity.
- Tocar na notificação abre direto o pedido no painel ao vivo.  
  
Pode executar esse plano.
  Prioridade absoluta:
  1. No start da Live Activity, pedir `activity_update` token corretamente.
  2. Registrar esse token no backend.
  3. Depois disso, nunca mais enviar novo start para o mesmo pedido.
  4. Usar update/end pelo token da activity.
  5. Corrigir o botão ACEITAR PEDIDO e o toque para abrir `/panel/live?order={id}`.
  Não mexer no visual agora.
  Não mexer no APNS_USE_SANDBOX.
  Manter push normal repetido com som.
  Quero primeiro resolver:
  1 pedido = 1 Live Activity.
  Tempo correndo no mesmo cartão.
  Botão aceitar funcionando.
  Tocar na notificação abrindo o painel ao vivo.