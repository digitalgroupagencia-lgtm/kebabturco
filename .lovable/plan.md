## Diagnóstico atual (item por item)

### 1. Perfil que deve ficar logado no tablet

- **Operador (operator)** é o perfil correto para o tablet do restaurante. Ele acessa o **/panel/live** (PanelOrdersBoard) — tela operacional de pedidos.
- `kitchen` é mais restrito (só vê itens prontos para cozinha).
- `restaurant_admin` tem acesso ao painel mas também a configurações/relatórios — risco de alguém alterar preço/menu por engano.
- `admin_master` é da plataforma, não do restaurante.
- **Recomendação:** criar um PIN de operador e deixar o tablet logado nesse perfil, com a tela do painel ao vivo aberta.

### 2. Painel precisa ficar aberto?

**Hoje, sim — parcialmente.** Como está implementado:

- Som de alerta + flash visual + loop até "Aceitar pedido" → **só dispara se o painel estiver aberto na aba ativa** (`panelAlerts.ts` + `usePanelOrders`).
- Realtime via Supabase channel + polling de fallback (30s ativo / 8s backup) → **só roda enquanto o painel está montado**.
- Push notification para staff: **existe a função `notifyStaffNewOrder()` em `src/services/pushService.ts` mas ela NÃO é chamada em lugar nenhum**. Ou seja, hoje o backend nunca notifica a equipa quando entra pedido novo.
- Impressão automática: idem, depende do painel estar aberto.

### 3. Notificação sonora estilo iFood

**Parcialmente implementado:**

- ✅ Som imediato ao chegar pedido (`playNewOrderAlert`).
- ✅ Loop a cada 4s enquanto o pedido estiver em "Recebido" (`registerNewPendingOrderAlert` + `ensurePendingAlertLoop`).
- ✅ Flash visual (`PANEL_ALERT_FLASH_EVENT`).
- ❌ Vibração: **não implementada** (não há `navigator.vibrate` no panelAlerts).
- ❌ Tudo isso **só funciona com o painel aberto e o som desbloqueado** (precisa toque inicial em "Ativar alertas" por causa de autoplay policy).

### 4. Comportamento por cenário (estado atual)


| Cenário                              | Som                                                            | Vibração | Notif. visual     | Impressão | Push                                              |
| ------------------------------------ | -------------------------------------------------------------- | -------- | ----------------- | --------- | ------------------------------------------------- |
| **A. App aberto na tela de pedidos** | ✅ loop                                                         | ❌        | ✅ flash + toast   | ✅         | ❌ (não chamado)                                   |
| **B. App minimizado (background)**   | ⚠️ se Web Push ativo → notificação do sistema; sem som de loop | ❌        | ⚠️ só notificação | ❌         | ❌ (porque `notifyStaffNewOrder` nunca é invocado) |
| **C. Tela bloqueada**                | ❌ hoje nada chega                                              | ❌        | ❌                 | ❌         | ❌                                                 |
| **D. App totalmente fechado**        | ❌                                                              | ❌        | ❌                 | ❌         | ❌                                                 |


### 5. Push Notifications reais (FCM/APNs)

**Hoje o sistema usa Web Push (VAPID) via Service Worker (`/push-handler.js`)**, não FCM/APNs nativos. Implicações:

- **Android (Chrome / PWA instalado)**: Web Push funciona em background **se** o usuário ativou notificações. O APK Capacitor também recebe porque carrega no WebView, mas é frágil quando o sistema mata o processo.
- **APK Capacitor fechado**: **não recebe** Web Push de forma confiável (Android encerra o WebView; só FCM nativo garante entrega).
- **iPad/iPhone Safari**: Web Push só funciona se o cliente instalar como PWA (Adicionar à Tela Inicial) **e** estiver em iOS 16.4+.
- **iPhone com app fechado**: Web Push em PWA é entregue pelo APNs do Apple Push Service, mas só se o PWA foi instalado.

### 6. Gaps críticos identificados

1. `**notifyStaffNewOrder` órfã** — função existe mas nunca é invocada. Resultado: nenhum push chega à equipe.
2. **Sem trigger no backend** — deveria haver um trigger no insert em `orders` (DB trigger ou edge function chamada pelo cliente após submit) que dispara push para todas as `push_subscriptions` com tag `__staff__` daquela loja.
3. **Sem vibração** no `panelAlerts.ts`.
4. **Sem push nativo (FCM)** no APK Android — necessário para confiabilidade quando app está fechado.
5. **Sem Wake Lock** ativo no painel — tablet pode dormir e perder pedidos mesmo com painel aberto.
6. **Tela do painel não tem keep-awake garantido** quando perfil é operador.

---

## Plano de implementação

### Fase 1 — Push para staff funcionar em background (web/PWA) [CRÍTICO]

1. Chamar `notifyStaffNewOrder(store_id, order_id, order_number)` automaticamente quando um pedido novo entra. Duas opções (escolher uma):
  - **Opção A (mais simples):** chamar no cliente após o `INSERT` em `orders` (ex.: dentro de `PaymentScreen`/`ReviewScreen` após confirmar pedido).
  - **Opção B (mais robusta):** criar **DB trigger** que chama edge function `notify-staff-new-order` via `pg_net`/HTTP, garantindo disparo mesmo se o cliente perder rede após submit.
2. Adicionar **vibração** em `panelAlerts.ts` (`navigator.vibrate([300,100,300,100,500])` no loop).
3. Garantir que o `push-handler.js` mostra notificação com `requireInteraction: true` para pedido de staff (não some sozinha).

### Fase 2 — Confiabilidade no tablet Android (APK Capacitor) [CRÍTICO]

1. Instalar plugin `@capacitor/push-notifications` + configurar **Firebase Cloud Messaging (FCM)**:
  - Criar projeto Firebase (precisa do usuário criar conta gratuita).
  - Adicionar `google-services.json` no APK.
  - Registrar device token na tabela `push_subscriptions` com `audience='staff_native'`.
  - Edge function `send-push-notification` passa a enviar via FCM HTTP v1 quando a subscription é nativa, e via Web Push (VAPID) quando é browser.
2. Configurar canal de notificação Android com som customizado (`alert-beep.wav`), prioridade `MAX`, vibração e bypass do "Não perturbe".
3. Garantir `@capacitor/keep-awake` ou Wake Lock API quando o painel operador estiver ativo.

### Fase 3 — iOS (iPad/iPhone) [se houver demanda]

1. Web Push via PWA: instruir cliente a "Adicionar à Tela Inicial" e exigir iOS 16.4+.
2. Para app nativo iOS: precisaria de conta Apple Developer ($99/ano) + APNs configurado — fora do escopo atual a menos que o cliente queira.

### Fase 4 — UX operacional do tablet

1. Criar perfil **"Operador de balcão"** com PIN simples no `staff_access_pins` e tela de "boot" que abre direto no `/panel/live` ao acordar.
2. Banner persistente "Alertas ativos ✓ • Som ✓ • Vibração ✓ • Push ✓" para o operador ter certeza visual.
3. Botão "Testar alerta agora" visível no painel (já existe parcialmente em `playTestAlert`).
4. Auto-reativar alertas após reload (já parcialmente implementado).

### Fase 5 — Testes e validação técnica

Após Fases 1 e 2, validar cada cenário com checklist real:

- ✅ App aberto → som loop + vibração + flash + push redundante
- ✅ App minimizado → push FCM com som + vibração + notificação fixa
- ✅ Tela bloqueada → push FCM acorda a tela (Android: priority MAX)
- ✅ App fechado/swipeado → push FCM ainda chega (FCM mantém canal)
- ✅ Impressão automática quando app aberto; backup: edge function `print-order` pode imprimir via job na fila quando há impressora Cloud (não LAN)

---

## Decisões que preciso de você antes de codar

**1. Trigger do push staff:** prefere **Opção A** (chamada no cliente, simples e rápida de implementar hoje) ou **Opção B** (DB trigger no backend, mais robusta mas exige criar pg_net e migration)?

**2. FCM (Firebase):** posso preparar todo o código no projeto, mas você vai precisar:

- Criar conta Firebase (grátis) e baixar `google-services.json`
- Gerar chave de serviço FCM e adicionar como secret `FCM_SERVER_KEY` no Lovable Cloud
- Rebuildar o APK com o plugin instalado

   Quer seguir com FCM agora, ou primeiro só consertamos o Web Push (Fase 1) e validamos?

**3. iOS:** vamos cobrir só Android no tablet do restaurante, ou também precisa que iPhone do dono receba notificação em background?

Me responda essas 3 perguntas e eu já implemento na ordem certa.  
  
Escolho a Opção B.

Quero trigger no backend para garantir que todo pedido novo gere notificação independentemente do navegador, dispositivo ou estado da tela.

Não quero depender de chamada do frontend para alertar o restaurante.

2. Quero implementar FCM agora.

Preparem toda a estrutura Firebase necessária.

Depois me informem exatamente:

- quais credenciais preciso criar
- onde baixar o google-services.json
- quais secrets preciso adicionar
- quais passos preciso executar para rebuildar o APK

Quero o sistema funcionando com notificações Android em background, tela bloqueada e aplicativo fechado.

3. Neste momento o foco principal é Android.

O tablet do restaurante é prioridade absoluta.

Depois que Android estiver 100% confiável, avaliamos iPhone/iPad para os proprietários do restaurante.