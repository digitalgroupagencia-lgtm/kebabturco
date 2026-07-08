# Security Audit Checklist — 2026-07-08

## Escopo aplicado

- Recalcular total/subtotal/desconto/taxa no backend.
- Restringir marcação de pagamento online para webhooks.
- Endurecer confirmação de pagamento manual com auditoria.
- Bloquear avanço para cozinha sem pagamento confirmado.
- Fidelidade apenas após `payment_status = paid`.
- Tracking público via token secreto (anti-IDOR).
- QR mesa: bloquear leitura direta de `qr_token` e reforçar checks de loja.
- RLS de `push_subscriptions` restringido.
- Uploads restritos a extensões/tipos seguros.
- Rate limit server-side para criação de pedidos e confirmação manual.

## Testes executados no código

- `vitest`:
  - `src/lib/routeRedirects.test.ts` ✅
  - `src/lib/panelAlerts.test.ts` ✅
- `eslint .` ⚠️
  - falhou por erros pré-existentes na pasta não versionada `proprioapp-white-label/`
  - sem evidência de erro novo no código alterado desta auditoria.

## Validações manuais obrigatórias após aplicar SQL

1. Tentar criar pedido com `_total` adulterado no cliente:
   - esperado: pedido gravado com total recalculado no servidor.
2. Tentar chamar `record_payment_settlement` com utilizador normal:
   - esperado: sem permissão.
3. Tentar chamar `confirm_order_payment` com `anon`:
   - esperado: sem permissão.
4. Tentar marcar pagamento manual em pedido cancelado:
   - esperado: rejeição.
5. Tentar avançar `pending -> preparing` em takeaway/delivery não pago:
   - esperado: rejeição.
6. Tracking público:
   - `?order=<uuid>` sozinho não deve abrir dados.
   - `?ot=<token>` deve abrir apenas o pedido correto.
7. Upload de `svg` em buckets públicos:
   - esperado: rejeição por policy.
8. Conferir que `manual_payment_audit` grava:
   - `order_id`, `staff_user_id`, `method`, `amount`, `created_at`.

