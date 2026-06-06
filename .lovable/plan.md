## Verificação do projeto remixado

Sem pedir segredos. Apenas validar que o remix está íntegro.

### Passos

1. **Build TypeScript** — rodar `tsc --noEmit` e confirmar zero erros.
2. **Rota `/`** — abrir no preview e confirmar render sem erro de runtime (console limpo, sem tela branca).
3. **Rota `/auth`** — abrir no preview e confirmar render do formulário de login.
4. Caso algum dos 3 falhe, corrigir só o necessário para destravar (sem mexer em design ou regras de negócio).

### Segredos necessários no futuro (só referência, não pedir agora)

Pagamentos Stripe (modo teste):
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `STRIPE_PUBLISHABLE_KEY_TEST` (publicável — pode ir em `config/stripe.public.env`)

Web Push (navegador/PWA):
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Push nativo Android:
- `FCM_SERVICE_ACCOUNT_JSON`

Autorização interna de push staff:
- `STAFF_PUSH_INTERNAL_SECRET`

Enquanto ausentes, as edge functions (`send-push-notification`, Stripe) já têm fallback e respondem `skipped` em vez de quebrar — o app continua funcional sem essas integrações.

### Entrega

Relatório curto no chat com: status do build, status de cada rota, e a lista acima.