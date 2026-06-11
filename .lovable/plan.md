## Problema

A página `/admin/finance` quebra com `TypeError: Cannot read properties of null (reading 'slice')` e mostra "Erro no painel" (o `AdminErrorBoundary` apanha).

Causa: em `src/components/finance/AdminPayoutIntakeForm.tsx` (linha 165), no modo "colapsado" após guardar, faz-se:

```ts
IBAN ···· {saved.iban.slice(-4)}
```

Quando o restaurante guardou os dados sem IBAN (ou o campo voltou `null` da base), `saved.iban` é `null` → crash.

## Correção

1. Guardar contra `iban` nulo/vazio antes de chamar `.slice(-4)`:
   - Se houver IBAN com pelo menos 4 caracteres → mostrar `IBAN ···· {ultimos4}`.
   - Caso contrário → mostrar `IBAN não preenchido` (texto neutro, sem crash).
2. Aplicar o mesmo cuidado em `owner_email` (já tem fallback) e em qualquer outro campo opcional usado nesse bloco resumo, se existir.

Sem mudanças de lógica de negócio, sem mudar Stripe/edge functions — apenas tornar o render defensivo para não derrubar o painel.

## Verificação

- Recarregar `/admin/finance` no preview: a página deve carregar normalmente, mostrando o resumo "Dados do restaurante guardados" com `IBAN ···· XXXX` ou `IBAN não preenchido`, sem o ecrã vermelho de erro.
- Console sem `TypeError ... slice`.
