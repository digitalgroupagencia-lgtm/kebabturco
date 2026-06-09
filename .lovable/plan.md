Pelo que aparece nas capturas, isso não é por estar em modo teste. A Stripe já confirmou o pagamento como OK; o problema está depois disso, na etapa em que o app precisa criar/sincronizar o pedido e mudar para a tela de confirmação.

Plano de correção:

1. Ajustar o fluxo do cartão
- Manter a confirmação do pagamento pela Stripe como está.
- Depois do `paymentIntent.succeeded`, criar o pedido no banco com status pago.
- Só limpar o carrinho e trocar de tela depois que o pedido tiver `order_id` e `order_number` válidos.
- Evitar que qualquer reset de estado mande o cliente de volta para a seleção de método.

2. Corrigir a validação de valor
- Hoje há risco de divergência entre o valor cobrado pela Stripe e o valor esperado na verificação do servidor, porque o pagamento pode incluir taxa online, mas a verificação compara só o total do restaurante.
- A correção será comparar com o valor real do PaymentIntent criado pela Stripe e manter o pedido vinculado ao `stripe_payment_intent_id`.

3. Tornar o webhook/servidor mais confiável
- Garantir que, quando a Stripe enviar `payment_intent.succeeded`, o backend consiga marcar o pedido como pago se ele já existir.
- Se o webhook chegar antes do pedido existir, o frontend ainda concluirá o pedido após o sucesso do cartão, sem depender somente do webhook.

4. Melhorar o erro na tela
- Quando a criação do pedido falhar depois de um pagamento OK, mostrar uma mensagem clara de “pagamento aprovado, estamos registrando o pedido” em vez de voltar silenciosamente para escolher método.
- Registrar logs úteis para identificar rapidamente se falhar criação de pedido, verificação ou impressão.

5. Sincronizar backend
- Depois das mudanças, publicar/deployar as funções Stripe necessárias.
- Testar endpoints críticos (`stripe-create-payment-intent`, `stripe-verify-payment-intent`, `stripe-webhook`) para confirmar que estão ativos.

Arquivos previstos:
- `src/customer/screens/PaymentScreen.tsx`
- `src/components/StripePaymentForm.tsx` se precisar ajustar retorno/estado do Stripe
- `supabase/functions/_shared/stripePaymentActions.ts`
- `supabase/functions/stripe-webhook/index.ts` se necessário
- possível migration somente se a função do banco precisar aceitar melhor a liquidação do pagamento

Resultado esperado:
- Em teste e em live: clicar em finalizar pedido, pagar com cartão, ver tela de confirmação e o pedido aparecer no painel do restaurante.
- Stripe OK não deve mais devolver o cliente para seleção de método.