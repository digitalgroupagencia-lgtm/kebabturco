## Objetivo

Restaurar tudo o que parou de funcionar desde a build 10 (`2f01bab`, 25 Jun) mantendo as novidades pedidas entretanto (PIN, fidelização, Durum/Kapsalon, vendedor, WGM, Tap to Pay demo, autofill iOS, etc.). O diff é grande (229 ficheiros, +15k linhas) — em vez de reverter em bloco, vou corrigir **só as regressões**, agrupadas em 4 frentes.

## Frentes de correção (ordem de execução)

### 1. Painel e login da equipa
- **Marcar listo / mudar etapa do pedido** — auditar `update_order_status_v2` (RPC SECURITY DEFINER) + GRANTs em `orders`. Garantir que `restaurant_admin`, `operator` e `kitchen` conseguem chamar a RPC e que o painel usa a RPC, não UPDATE directo.
- **Login Google da equipa** — confirmar que `register_staff_google_login` insere em `staff_google_pending` quando não há `user_roles`, e que o `TeamPage` mostra o pedido. Corrigir `redirectUri` se estiver a apontar para `/staff` em vez de `/auth/callback`.
- **Sessão da equipa cai ao fechar app** — verificar `nativeAuthStorage` em `src/integrations/supabase/client.ts`: o `getItem` async pode estar a devolver `null` antes do Supabase ler do `Preferences`. Fazer hidratação síncrona via cache em memória + warm-up no boot nativo.
- **Vendedor: ecrã pisca ao abrir novo pedido** — race em `SellerNewOrder.tsx` ao montar (useEffect que dispara reload). Estabilizar dependências.

### 2. Notificações e som
- **Push não chega ao iPhone TestFlight** — verificar `send-push-notification`: dual-host APNs (production + sandbox), `apns-topic` igual ao bundle id, `apns-push-type: alert`. Garantir que `register_native_push_subscription` não apaga outros tokens da loja (já corrigido — confirmar migração aplicada).
- **Som de novo pedido toca como música/aleatório** — `AppDelegate.swift` define `AVAudioSession` como `.ambient` (já feito). Confirmar que o payload APNs envia `"sound": "kaching.wav"` (não default) e que `kaching.wav` está incluído no bundle iOS.
- **Diagnóstico "está no browser" no iPhone** — já corrigido em `nativePush.ts` com fallback APNs token, validar.

### 3. Tap to Pay e orientação iPhone
- **Tap to Pay não abre / 2 botões "conectando leitor"** — em `useTapToPayCheckout.tsx`, deduplicar chamadas concorrentes a `connectReader`. Confirmar que entitlement de produção (`App.Release.entitlements`) tem `aps-environment=production` e `proximity-reader.payment.acceptance=true` (já está). O scra só abre após nova build Codemagic — documentar no fim.
- **Painel abre vertical no app nativo** — `AppDelegate.swift` já delega a `CAPBridgeViewController.supportedInterfaceOrientations`. Validar que `capacitor.config.ts` tem `ScreenOrientation` plugin e que `useScreenOrientationLock.ts` chama `ScreenOrientation.lock({orientation: 'landscape'})` nas rotas de painel. Só efetiva após nova build.

### 4. Pagamento, impressão e QR
- **Impressão duplicada** — confirmar que migração `enqueue_print_job` com `pg_advisory_xact_lock` está aplicada e que `checkoutPrintHelper.ts` não chama a função duas vezes (uma para cliente, outra para cozinha — deve ser job único com `copies`).
- **QR da mesa** — confirmar permissão de câmara no `Info.plist` (já corrigido) e fallback de `getUserMedia` em Safari mobile.
- **Pagamento dinheiro/cartão/bizum** — correr `add_loyalty_stamp` ambiguidade já corrigida. Validar com query SQL que não há triggers órfãos.

## Plano de execução

1. Ler ficheiros-chave de cada frente em paralelo: `update_order_status_v2`, `nativeAuthStorage`, `SellerNewOrder.tsx`, `send-push-notification`, `useTapToPayCheckout.tsx`, `useScreenOrientationLock.ts`, `checkoutPrintHelper.ts`.
2. Para cada problema confirmado, fazer correção mínima e cirúrgica (sem mexer no que está a funcionar).
3. Aplicar migrações SQL adicionais só se faltarem GRANTs ou RPCs.
4. No fim, listar:
   - O que foi corrigido só no site (entra com Publish da Lovable, imediato).
   - O que precisa de nova build Codemagic (orientação nativa, Tap to Pay real, som APNs custom).

## Fora de scope (não toco)

- Funcionalidades novas (PIN, Durum/Kapsalon, WGM, vendedor, fidelização) — só corrijo se estiverem a causar regressão.
- Branding, cores, traduções.
- Reverter para `2f01bab` — perderias tudo o resto.

## Detalhes técnicos

- Não vou rodar migrações destrutivas; só `CREATE OR REPLACE FUNCTION`, `GRANT`, e migrações idempotentes.
- Cada correção é commitada implicitamente pela Lovable; podes reverter ponto a ponto pelo histórico do chat se algo correr mal.
- Após terminar, recomendo Publish na Lovable + nova build Codemagic para apanhar as mudanças nativas.

Confirmas que avanço com este plano? Se quiseres priorizar uma frente específica primeiro (ex.: "começa pelo painel listo + push"), diz e eu reordeno.
