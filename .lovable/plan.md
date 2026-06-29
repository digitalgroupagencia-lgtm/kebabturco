## Plano: investigar crash de inicialização iOS/TestFlight sem tentativa cega

### Escopo bloqueado
Não vou mexer em pagamento, banco, checkout, impressão ou pedidos. O único objetivo é fazer o app TestFlight abrir e confirmar onde ele morre no primeiro segundo.

### Fatos já verificados no código atual
- **Commit atual do projeto:** `7ccc5194` em `main`; **não é** o commit da build 10 (`2f01babb`).
- **Build 10 conhecida:** `2f01babb` — “Corrigir som das notificações de pedido no iPhone.”
- **server.url está correto no fonte:** `capacitor.config.ts:7-9` aponta para `https://kebabturco.net`.
- **`ios/App/App/capacitor.config.json` não existe no Git:** ele só é gerado durante `npx cap sync ios`, então a prova real precisa vir do log/artefato da build.
- **AppDelegate não mudou desde a build 10:** `ios/App/App/AppDelegate.swift:9-10` só retorna `true` no arranque; APNs entra em `13-18` e redelivery em `27-32`.
- **Info.plist atual:** `ios/App/App/Info.plist:31-34` mudou de `armv7` para `arm64`; `52-55` mantém remote-notification.
- **Release entitlements:** `ios/App/App/App.Release.entitlements:5-6` só tem APNs production; Tap to Pay não está no Release.
- **Debug entitlements:** `ios/App/App/App.entitlements:5-8` tem Tap to Pay + APNs development, mas isso não deveria entrar na build App Store/TestFlight.
- **Stripe/Tap to Pay no Release:** `ios/App/CapApp-SPM/Package.appstore.swift` não inclui Stripe Terminal. Então Stripe/Tap to Pay é pouco provável como causa direta do crash de abertura da build App Store.
- **Firebase:** existe `GoogleService-Info.plist`, mas não há `FirebaseApp.configure()` no `AppDelegate`, então Firebase não parece inicializar no primeiro segundo.

### Suspeitas reais a confirmar
1. **A build TestFlight atual pode não estar usando o commit esperado.** O `main` atual é `7ccc5194`, não `2f01babb`. Precisa ficar impresso no Codemagic e embutido no app/IPA para não haver dúvida.
2. **Config nativa gerada no Codemagic pode estar diferente do fonte.** O script `scripts/sync-ios-for-release.sh:9-13` roda `npx cap sync ios`, troca Package.swift e depois força `capacitor.config.json`. Preciso validar o arquivo final gerado dentro da build.
3. **Possível risco no bridge/plugin APNs customizado.** `scripts/ios-patch-capacitor-config-appstore.sh:17-23` força `ApnsTokenBridgePlugin` no `packageClassList`; o plugin também existe em Swift dentro do target iOS. Se a lista final ou registro do plugin estiver inconsistente na build gerada, pode causar falha nativa/bridge no arranque.
4. **Possível risco por plugins removidos do IPA mas chamados cedo pelo site remoto.** `@capacitor/preferences` e `@capacitor/geolocation` foram adicionados depois da build 10 no `package.json`, mas o Release remove `PreferencesPlugin` e `GeolocationPlugin` do `packageClassList`. Isso normalmente gera erro JS, não crash nativo, mas precisa ser isolado.

### Implementação de diagnóstico segura
1. **Carimbar a build com commit real**
   - Adicionar no fluxo iOS App Store um log obrigatório de `git rev-parse HEAD`.
   - Escrever esse commit em um arquivo/valor de build nativo inspecionável no artefato.
   - Resultado esperado: saber exatamente qual commit gerou o TestFlight.

2. **Imprimir o `capacitor.config.json` final usado no IPA**
   - No fim de `scripts/sync-ios-for-release.sh`, registrar `server.url` e `packageClassList` final.
   - Confirmar que `server.url = https://kebabturco.net`.
   - Confirmar se entram apenas os plugins nativos realmente compilados.

3. **Adicionar logs mínimos no início do AppDelegate**
   - Logar começo/fim de `didFinishLaunchingWithOptions`.
   - Logar `applicationDidBecomeActive`, `applicationWillEnterForeground`, APNs success/error.
   - Instalar handler simples de exceção fatal para capturar último ponto antes do fechamento.
   - Sem mudar fluxo de pedidos, pagamentos, checkout, banco ou impressão.

4. **Build mínima de isolamento, se o crash continuar**
   - Criar modo temporário de diagnóstico no Release para remover do arranque: PushNotifications, ApnsTokenBridge e qualquer plugin não essencial.
   - Manter apenas app remoto abrindo `https://kebabturco.net`.
   - Objetivo: provar se o crash é do shell nativo/plugin ou do site remoto carregado no WebView.

5. **Comparar build que abria vs primeira build que fecha**
   - Usar `2f01babb` como baseline.
   - Comparar somente arquivos nativos/iOS/Codemagic/Capacitor/plugins:
     - `capacitor.config.ts`
     - `codemagic.yaml`
     - `ios/App/AppDelegate.swift`
     - `ios/App/Info.plist`
     - `ios/App/*.entitlements`
     - `ios/App/CapApp-SPM/*`
     - `ios/App/App/ApnsToken*.swift`
     - `scripts/sync-ios-for-release.sh`
     - `scripts/codemagic-ios-appstore-build.sh`
     - `package.json` / lockfile para plugins Capacitor
   - Entregar diff exato por arquivo, com linhas.

### Entrega final depois da investigação
Vou entregar exatamente:
- **causa provável**;
- **causa confirmada** quando houver log/artefato;
- **arquivo e linha**;
- **diff exato**;
- **como testar no TestFlight**;
- **rollback limpo** para voltar ao estado anterior se a build diagnóstica não abrir.

### Rollback previsto
- Se o diagnóstico mostrar que o problema é plugin/bridge: voltar temporariamente ao shell da build 10, com `server.url` remoto e sem plugins extras no arranque.
- Se mostrar que o problema é commit errado no Codemagic: travar o workflow para buildar exatamente o commit esperado antes de testar novas mudanças.
- Se mostrar que o problema é site remoto quebrando o WebView: corrigir somente o boot web, ainda sem tocar em pagamentos/pedidos.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>