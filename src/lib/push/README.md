# Arquitectura de Push (Fase 3 — Isolamento lógico)

O service worker é **único** (`/push-handler.js`) e a infra de subscrição é
partilhada. Mas as APIs públicas estão separadas por área para que alterações
no push interno (staff/admin/diagnósticos) **nunca toquem o push do cliente**.

## Mapa lógico

```
src/lib/push/
├── shared/        ← núcleo partilhado (subscrição, SW, logger, VAPID, probes)
├── customer/      ← API exclusiva do cardápio (marketing + pedidos)
└── staff/         ← API exclusiva do painel/equipa/admin (incl. diagnóstico)
```

Os ficheiros físicos continuam onde estavam (`pushSubscriptionCore.ts`,
`staffPush.ts`, `customerMarketingPush.ts`, etc.). Os barrels em
`customer.ts` / `staff.ts` / `shared.ts` documentam fronteiras e devem ser
usados em código novo. Refactor físico fica para a Fase 2 (depois da
validação de produção).

## Regras (validadas pelo smoke test)

| Camada     | Pode importar de…                          | NÃO pode importar de…           |
|------------|--------------------------------------------|---------------------------------|
| customer   | `shared/*`                                 | `staff/*`, `diagnostics/*`      |
| staff      | `shared/*`, `diagnostics/*`                | `customer/*` (chamar via canal)|
| shared     | nada acima                                 | qualquer cliente/staff          |

O cliente já está blindado: o `customer-smoke-test.mjs` bloqueia o build se
algum ficheiro do fluxo cliente importar estaticamente `staffPush.ts`,
`pushTestService.ts`, `printerService.ts`, `operationalDiagnosticsService.ts`,
`features/ops/*`, `lib/diagnostics/*` ou qualquer pasta interna.
