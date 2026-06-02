# Análise de Impacto — Fase 2 (separação física da área cliente)

## 1. Ficheiros que seriam movidos

| Grupo | Ficheiros | Destino proposto |
|---|---|---|
| Ecrãs cliente | 14 (`src/components/screens/*.tsx`) | `src/customer/screens/` |
| Customização de produto | 12 (`src/components/customization/*.tsx`) | `src/customer/customization/` |
| Componentes `Customer*` na raiz | 9 (`CustomerTabBar`, `CustomerBottomDock`, `CustomerPushPromptHost`, `CustomerNotificationOptInDialog`, `CustomerAreaBoundary`, `CustomerScreenErrorBoundary`, etc.) | `src/customer/components/` |
| `features/customer/` | 3 (`ActiveOrderBar`, `useActiveOrder`, `useActiveOrderStorage`) | `src/customer/active-order/` |
| Página de entrada | 1 (`src/pages/Index.tsx`) | `src/customer/Index.tsx` |

**Total: ~39 ficheiros físicos a mover.**

## 2. Imports a actualizar

- **33 ficheiros distintos** importam de pelo menos um dos caminhos a mover.
- Detalhe por símbolo:
  - `@/components/screens/*` → 2 importadores
  - `@/components/customization/*` → 7 importadores
  - `@/contexts/CartContext` → 17 importadores
  - `@/contexts/OrderContext` → 24 importadores
  - `@/features/customer/*` → poucos (≤3)
  - `@/pages/Index` → 1 (`AppRoutes`)

## 3. Contextos afectados

| Contexto | Uso só-cliente? | Decisão |
|---|---|---|
| `CartContext` | ✅ Sim | mover para `src/customer/contexts/` |
| `OrderContext` | ⚠ Usado também por `services/orderService`, `services/checkoutPrintHelper`, `lib/paymentMethods`, `lib/paymentPolicy`, `lib/modifiers/legacyBridge` | **NÃO mover** — só re-exportar via barrel. Mexer aqui = risco de partir checkout/Stripe/impressão. |
| `LanguageContext` | ⚠ Usado por `panel/MenuPage`, `panel/TablesPage`, `panel/ModifierGroupsPage` (i18n partilhado) | **NÃO mover** — é infra partilhada |
| `BrandingContext` | ⚠ Usado por `pages/Install`, componentes legais, ThemeToggle | **NÃO mover** |
| `ThemeContext` | ⚠ Usado por `AdminThemeToggle` | **NÃO mover** |

→ Apenas **1 contexto** (`CartContext`) é seguro de mover fisicamente.

## 4. Riscos por área

| Área | Risco | Mitigação |
|---|---|---|
| **Carrinho** | Baixo. `CartContext` é só-cliente. | Mover + actualizar 17 imports |
| **Checkout** | **Médio-alto.** `PaymentScreen` mover é OK, mas `paymentMethods`/`paymentPolicy`/`checkoutPrintHelper` partilham `OrderContext`. | **Não mover** `OrderContext`. |
| **Produto/modificadores** | Baixo. `customization/` é só-cliente. | Mover + actualizar 7 imports |
| **Pagamento (Stripe)** | Nenhum se não tocarmos em `services/*Stripe*` nem em `paymentMethods`/`paymentPolicy`. | Não mexer nestes ficheiros |
| **Notificações push** | Baixo. Já separadas na Fase 3. `CustomerPushPromptHost` move junto. | Mover sem tocar lógica |
| **Impressão** | **Médio.** `checkoutPrintHelper` importa `OrderContext`. Se mexermos no caminho, partimos. | Manter `OrderContext` no lugar |

## 5. Pode ser só "mover ficheiros + ajustar imports"?

**Sim — desde que o escopo seja reduzido.** A versão "mover tudo" parte coisas (contextos partilhados). A versão segura é:

- Mover apenas o que é **exclusivamente** consumido pelo cliente: `screens/`, `customization/`, `Customer*.tsx`, `features/customer/`, `pages/Index.tsx`, `CartContext`.
- **Manter no lugar** `OrderContext`, `LanguageContext`, `BrandingContext`, `ThemeContext`, `services/*`, `lib/payment*`, `lib/modifiers/*`, `services/printerService`, `services/checkoutPrintHelper`.
- Operação 100% mecânica: `git mv` + reescrita de paths de import. Zero alterações de lógica, UI, regras, comportamento.

## Plano de execução (Fase 2 — escopo reduzido)

1. **Criar estrutura**
   ```text
   src/customer/
     Index.tsx
     screens/        (14 ficheiros)
     customization/  (12 ficheiros)
     components/     (9 ficheiros Customer*)
     active-order/   (3 ficheiros)
     contexts/CartContext.tsx
   ```

2. **Mover ficheiros** (39 no total) preservando nomes.

3. **Reescrever imports**:
   - `@/components/screens/X` → `@/customer/screens/X`
   - `@/components/customization/X` → `@/customer/customization/X`
   - `@/components/Customer*` → `@/customer/components/Customer*`
   - `@/features/customer/*` → `@/customer/active-order/*`
   - `@/contexts/CartContext` → `@/customer/contexts/CartContext`
   - `@/pages/Index` → `@/customer/Index` (e actualizar `AppRoutes`)

4. **NÃO tocar** em: `OrderContext`, `LanguageContext`, `BrandingContext`, `ThemeContext`, qualquer `services/*`, `lib/payment*`, `lib/modifiers/*`, `lib/push/*` (mantém barris da Fase 3), `printerService`, `stripe*`, `print-bridge`.

5. **Actualizar `scripts/customer-smoke-test.mjs`** para apontar para os novos caminhos críticos (`src/customer/screens/...`).

6. **Actualizar `vite.config.ts`** — ajustar o pattern do chunk `customer` para apanhar `src/customer/**`.

7. **Validação obrigatória** (deploy bloqueia se falhar):
   - `node scripts/customer-smoke-test.mjs` → verde
   - `tsc --noEmit` (via build) → sem erros
   - Build dos chunks `customer` e `internal` separados

8. **Se qualquer passo falhar → reverter o move desse grupo** (commits separados por grupo: screens / customization / components / active-order / Index+CartContext).

## Regras respeitadas

- ✅ Zero alteração de comportamento
- ✅ Zero alteração de UI
- ✅ Zero alteração de regras de produto
- ✅ Zero alteração de checkout
- ✅ Zero alteração de Stripe
- ✅ Zero alteração de impressão

## Recomendação

**Avançar com a Fase 2 no escopo reduzido acima.** É uma operação mecânica (move + rename de imports) que entrega a separação física pedida sem tocar nas zonas críticas (Order/checkout/Stripe/impressão).

Confirma para eu executar?
