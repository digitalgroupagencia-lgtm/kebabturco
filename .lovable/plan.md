# Plano — Correções críticas para entrega

Vou executar em **3 ondas** por ordem de bloqueio. Cada onda termina compilando antes de avançar.

---

## ONDA 1 — Bloqueadores de segurança/UX para o cliente

### 1. Cliente NÃO pode tocar bip operacional (crítico)
- `src/customer/**`: garantir que nenhum hook/componente cliente importe `panelAlerts`, `usePushNotifications` em modo staff, ou `pushService` de staff.
- `src/hooks/usePushNotifications.ts` e `src/lib/push/staff.ts`: adicionar guarda hard — `if (!userRole || role === 'customer') return null`.
- `src/features/ops/PanelAlertsBar.tsx` + `usePanelOrders.ts`: validar `useUserRole` antes de qualquer `audio.play()` / `navigator.vibrate()`.
- Auditar `src/main.tsx` / `src/customer/Index.tsx` para garantir que `service-worker.js` cliente NÃO registra subscription staff.

### 2. Stripe debug overlay no celular do cliente
- Procurar em `index.html`, `src/customer/screens/PaymentScreen.tsx`, `ConfirmationScreen.tsx` por qualquer `stripe.js` carregado com `debug: true`, `appearance: { theme: 'stripe' }` em modo dev, ou Stripe Elements em ambiente errado.
- Causa provável: script `stripe-shell` ou `stripe.js?dev=true` carregado. Remover e travar carregamento de Stripe só no fluxo de pagamento.
- Verificar service worker e `public/sw.js` por scripts injetados.

### 3. Tablet toca em loop até aceitar TODOS pedidos pendentes
- `PanelAlertsBar.tsx` / `usePanelOrders.ts`: ajustar lógica para tocar enquanto `orders.filter(o => o.status === 'received' && !o.accepted_at).length > 0`.
- Adicionar timer em loop (a cada 8s) até count = 0.
- Validar role antes (ver item 1).

---

## ONDA 2 — Impressão e idioma

### 4. Ticket imprime detalhes do combo separadamente
- `supabase/functions/_shared/escPosTicketBuilder.ts` + `src/services/escPosTicketBuilder.ts`: detectar quando `item.extras` contém modifiers com padrão regex `/pan pita (\d+)/i`, `/unidad (\d+)/i`, `/(\d+)º/`, etc.
- Agrupar extras por índice, imprimir bloco "PAN PITA 1\n Carne: X\n Verduras: sin Y\n Picante: Sí/No" para cada unidade.
- Não resumir múltiplas remoções na mesma linha.
- Mesma lógica em `src/features/ops/panelPrintHelper.ts` (já tem `resolveProductName`).

### 5. Idioma do painel staff respeita `company_settings.default_language`
- `src/lib/staffI18n.ts` e `useStaffT.ts`: ler default da loja via `useCompanySettings()` se usuário não escolheu.
- Adicionar chaves faltantes em ES para: "Pedidos en vivo", "Operación en vivo", "Panel del repartidor", "Iniciar entrega", "Marcar listo", "Aceptar", "Rechazar", "Recibido", "En preparación", "Listo", "Entregado", "Cancelado", "Mostrador", "Para llevar", "Entrega a domicilio".
- Substituir strings hard-coded em PT em: `PanelOrdersBoard.tsx`, `OpsOrdersLayout.tsx`, `OpsStatusTabs.tsx`, `OpsOrderCard.tsx`, `OpsModeFilter.tsx`, `DeliveryHomePage.tsx`, `SellerHome.tsx`.

### 6. Ticket impresso em espanhol + correções de label
- `escPosTicketBuilder.ts` (shared + src): já está em ES, mas validar "Forma de pago", "Pago con tarjeta", "Pago en efectivo", "Para llevar" (não "llebar"), "Entrega a domicilio".
- Tradução por `order.language` ou `company.default_language`.

---

## ONDA 3 — Delivery, rota, painel e housekeeping

### 7. Código de entrega NÃO visível ao entregador
- `DeliveryHomePage.tsx`: remover bloco do código.
- Adicionar texto "Pide el código al cliente para finalizar la entrega".
- Adicionar `<Input>` "Introducir código" + botão "Confirmar entrega".
- Validar via RPC (criar `confirm_delivery_code(order_id, code)` se não existir, ou validar client-side comparando com `delivery_code`).
- Erro: "Código incorrecto".

### 8. Botão "Abrir ruta" funcional
- `DeliveryHomePage.tsx`: trocar handler para `window.location.href = \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(address)}\``.
- Em Capacitor Android: detectar `window.Capacitor` e usar `App.openUrl({ url: \`geo:0,0?q=\${encoded}\` })` para abrir picker nativo.

### 9. Tablet sempre landscape + sidebar compacto
- `src/services/androidOrientation.ts`: forçar landscape em rotas staff (`/panel`, `/admin`, `/kds`).
- Cliente: portrait. Delivery: portrait.
- Sidebar (provavelmente `src/views/panel/` layout): collapse por default mostrando só ícones, expandir on click.

### 10. Fila de impressão — botões admin
- Página de printer (provavelmente `SettingsPage.tsx` ou `DiagnosticsPage.tsx`): adicionar 4 botões "Limpiar fallidos", "Limpiar tests", "Reintentar pendientes", "Eliminar jobs antiguos".
- Migrations: RPCs `cleanup_failed_print_jobs`, `cleanup_test_print_jobs`, `retry_pending_print_jobs`, `cleanup_old_print_jobs(days)`.
- Confirm dialog antes.

### 11. Testes de validação
- Após cada onda: rodar `bun run build` para garantir que nada quebrou.
- No fim: validar via browser na preview os 5 cenários do brief.

---

## Notas técnicas

- **Idioma:** vou ler `default_language` da loja em runtime e passar para o `staffT()` e para o `escPosTicketBuilder` (novo argumento `lang`).
- **Combo parsing:** regex `/(?:pan pita|pita|unidad|item|hamburguesa|durum)\s*(\d+)/i` capturando índice, agrupando extras pelo número.
- **Cliente sem som:** guard pattern com `useUserRole()` retornando `null` ou role `customer` → block.
- **Stripe debug:** investigar `index.html` e qualquer `<script src*="stripe">` com flags de dev.

---

## Não inclui

- Refatoração de schema (combo_index nos extras) — fica pra depois, parseio pelo nome agora.
- Mudanças em produtos/categorias — só apresentação.
- Multi-tenant: idioma é por loja via `company_settings.default_language` já existente.

Aprova que eu já começo pela Onda 1?
