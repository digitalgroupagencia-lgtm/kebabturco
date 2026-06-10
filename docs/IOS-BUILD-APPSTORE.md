# Build iOS para App Store Connect / TestFlight

Este guia é para gerar o build iOS do Kebab Turco e enviar para o App Store
Connect. Tudo a partir do passo "Abrir no Xcode" **precisa de um Mac com
Xcode 15+ instalado**. Os comandos de terminal são executados na raiz do
projeto, depois de `git pull`.

---

## 0. Confirmações

- ✅ O projeto **usa Capacitor 8** (`@capacitor/core`, `@capacitor/cli`,
  `@capacitor/android` e agora `@capacitor/ios`).
- ✅ `capacitor.config.ts` aponta `webDir: "dist"` e `server.url:
  https://kebabturco.net` (o app nativo carrega o site publicado, então
  qualquer atualização que você publicar no Lovable aparece no app sem
  precisar de novo build).
- ⚠️ O `appId` global no `capacitor.config.ts` continua
  `app.lovable.d04adf9611f44dc9b79cf756a89ef084` para **não quebrar o APK
  Android já existente**. O bundle id do iOS (`net.kebabturco.app`) é
  configurado **dentro do Xcode** no passo 4 abaixo — isso é normal e
  suportado pelo Capacitor.

---

## 1. No Mac — preparar o projeto

```bash
git pull
npm install
npm run build
npx cap add ios          # só na primeira vez
npx cap sync ios
```

Se o `cap add ios` reclamar de CocoaPods:

```bash
sudo gem install cocoapods
cd ios/App && pod install && cd ../..
npx cap sync ios
```

Isso cria a pasta `ios/` com o projeto Xcode.

---

## 2. Ícone 1024×1024 e Splash

1. Crie o ícone mestre `resources/icon.png` (1024×1024, **sem
   transparência, sem cantos arredondados** — a Apple aplica a máscara).
2. (Opcional) `resources/splash.png` 2732×2732.
3. Gere todos os tamanhos:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --ios
```

Isso preenche `ios/App/App/Assets.xcassets/AppIcon.appiconset/` com todos
os tamanhos exigidos pela App Store (incluindo o 1024 do marketing).

---

## 3. Abrir no Xcode

```bash
npx cap open ios
```

(ou abra manualmente `ios/App/App.xcworkspace` — **sempre o .xcworkspace,
nunca o .xcodeproj**).

---

## 4. Configurar bundle id, nome e time no Xcode

No painel esquerdo, clique no projeto **App** → target **App** → aba
**Signing & Capabilities**:

- **Bundle Identifier:** `net.kebabturco.app`
- **Team:** selecione o seu Apple Developer Team (precisa estar logado em
  Xcode → Settings → Accounts).
- **Automatically manage signing:** ✅ marcado. O Xcode cria sozinho o
  certificado de distribuição e o provisioning profile App Store.

Na aba **General**:

- **Display Name:** `Kebab Turco`
- **Version:** `1.0.0` (ou superior à última enviada).
- **Build:** `1` (incrementar a cada upload).
- **Minimum Deployments:** iOS 14.0 ou superior.

Em `ios/App/App/Info.plist` confirme que existe:

```xml
<key>CFBundleDisplayName</key>
<string>Kebab Turco</string>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key><true/>
</dict>
```

(O `NSAllowsArbitraryLoads` é necessário porque o app fala com impressora
ESC/POS em rede local 192.168.x.x.)

---

## 5. No App Store Connect (pré-requisito)

Antes do upload o registro do app **já precisa existir** em
https://appstoreconnect.apple.com → My Apps com:

- Bundle ID `net.kebabturco.app` criado em
  https://developer.apple.com/account/resources/identifiers → o **mesmo
  bundle id** que você pôs no Xcode.
- SKU qualquer (ex.: `kebabturco-ios`).
- Contratos pagos ativos em Agreements, Tax, and Banking (sem isso o
  TestFlight aceita o build mas a App Store bloqueia a venda).

Se "TestFlight → Nenhuma compilação" é porque **nenhum Archive foi
enviado ainda** — é exatamente isso que os próximos passos resolvem.

---

## 6. Archive e Upload

No Xcode:

1. Selecione o destino **Any iOS Device (arm64)** (canto superior, ao
   lado do nome do esquema). Não pode ser simulador.
2. Menu **Product → Archive**. Aguarde o build (5–15 min na primeira vez).
3. Quando abrir o **Organizer**, selecione o archive recém-criado e
   clique em **Distribute App**.
4. Escolha **App Store Connect → Next**.
5. Escolha **Upload → Next**.
6. Deixe marcado:
   - ✅ Upload your app's symbols
   - ✅ Manage Version and Build Number (deixe o Xcode incrementar)
7. **Automatically manage signing → Next**.
8. Revise e clique **Upload**.

Após 5–30 min o build aparece em **App Store Connect → TestFlight →
iOS Builds**, inicialmente com status *Processing*. Quando virar *Ready
to Test* você pode adicionar testers internos imediatamente.

---

## 7. O que pode faltar (checklist Apple Developer)

| Item | Onde | Necessário? |
|---|---|---|
| Conta paga Apple Developer ($99/ano) | developer.apple.com | ✅ |
| Team selecionado no Xcode | Xcode → Settings → Accounts | ✅ |
| App ID `net.kebabturco.app` registrado | developer.apple.com → Identifiers | ✅ |
| App criado em App Store Connect com esse bundle id | appstoreconnect.apple.com | ✅ |
| Distribution Certificate (iOS Distribution) | gerado automaticamente pelo Xcode com "Automatically manage signing" | ✅ |
| Provisioning Profile App Store | idem, gerado automaticamente | ✅ |
| Push Notifications key (.p8) | só se for ativar push em produção | opcional |
| Sign in with Apple key | só se usar login Apple | opcional |
| Acordos pagos assinados | App Store Connect → Agreements | ✅ para vender |

Se o Xcode falhar no signing, abra **Settings → Accounts → seu Apple ID →
Manage Certificates → +** e crie um **Apple Distribution**. Depois volte
em Signing & Capabilities e marque/desmarque "Automatically manage
signing" para o Xcode regenerar o profile.

---

## 8. Próximos uploads

Para cada nova versão:

```bash
git pull
npm install
npm run build
npx cap sync ios
npx cap open ios
```

No Xcode incremente **Build** (e **Version** quando for release pública),
Product → Archive → Distribute App → App Store Connect → Upload.
