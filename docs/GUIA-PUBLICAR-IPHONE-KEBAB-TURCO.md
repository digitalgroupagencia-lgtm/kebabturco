# Publicar a app Kebab Turco no iPhone (guia simples)

Este projecto **já tem** a estrutura iPhone (Capacitor). **Não dá** para a Apple publicar sozinha pelo terminal — a Apple exige passos no site deles e no Xcode no Mac. O que **dá** é correr **um comando** que prepara tudo e abre o Xcode.

---

## O que NÃO é possível automatizar (limitação da Apple)

- Criar a app na App Store Connect (site Apple)
- Aceitar contratos e impostos na App Store
- Criar chave de notificações push (site Apple Developer)
- Carregar capturas de ecrã e descrição na loja
- Aprovação da Apple (revisão humana)

**Ninguém** (nem Cursor, nem Lovable) entra na sua conta Apple por si. Precisa do **Mac + Xcode + conta Developer** (99 USD/ano).

---

## O que JÁ está no projecto

| Item | Estado |
|------|--------|
| Código web (Lovable / GitHub) | Pronto — publica em kebabturco.net |
| Pasta iPhone (`ios/`) | Pronta |
| App abre o site publicado | Sim — actualizações Lovable chegam sem rebuild |
| Notificações push Android | Configuradas (Firebase) |
| Notificações push iPhone | Falta ligação Apple ↔ Firebase |

---

## Comando único (no Mac, na pasta do projecto)

```bash
chmod +x scripts/prepare-ios-app.sh
./scripts/prepare-ios-app.sh
```

Ou:

```bash
npm run cap:prepare:ios
```

Isto: compila o site → sincroniza iPhone → abre o Xcode.

---

## Passo a passo manual (ordem correcta)

### A — Firebase (browser)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Kebab Turco Gandia**
2. Adicionar app **iOS** (ícone Apple)
3. Bundle ID: `app.lovable.d04adf9611f44dc9b79cf756a89ef084` (igual ao Xcode)
4. Descarregar **GoogleService-Info.plist**
5. Colocar o ficheiro em: `ios/App/App/GoogleService-Info.plist`

### B — Apple Developer (browser) — chave push

1. [developer.apple.com](https://developer.apple.com) → **Account** → **Keys**
2. **+** → nome «Kebab Turco Push» → activar **Apple Push Notifications service (APNs)**
3. Descarregar ficheiro `.p8` (só uma vez — guarde bem)

### C — Firebase de novo — ligar Apple

1. Firebase → Definições → **Cloud Messaging**
2. Secção **Apple app configuration**
3. Carregar: ID da equipa (Team ID), Key ID, ficheiro `.p8`

### D — Xcode (Mac)

1. Correr `./scripts/prepare-ios-app.sh`
2. Projecto **App** → target **App** → **Signing & Capabilities**
3. **Team:** escolher a sua conta Developer
4. **+ Capability:** Push Notifications
5. **+ Capability:** Background Modes → marcar **Remote notifications**
6. **Display Name:** «Kebab Turco» (nome que aparece no iPhone)

### E — App Store Connect (browser)

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Apps** → **+** → **New App**
3. Nome: Kebab Turco  
4. Bundle ID: o mesmo do Xcode  
5. Preencher descrição, ícone 1024×1024, capturas de ecrã (iPhone + iPad se quiser)

### F — Enviar para revisão (Xcode)

1. Menu **Product** → **Archive** (só funciona com «Any iOS Device», não simulador)
2. **Distribute App** → **App Store Connect** → Upload
3. Na App Store Connect → **Submit for Review**

---

## Se apagou a app na App Store Connect

Pode **criar outra** com o mesmo Bundle ID (se o ID ainda existir em Certificates, Identifiers & Profiles). Se removeu tudo:

1. **Identifiers** → **+** → App IDs → criar de novo com o mesmo bundle ID
2. App Store Connect → **New App** de novo

Apagar na loja **não apaga** o projecto no GitHub — só o registo na Apple.

---

## Nome bonito na loja (opcional)

O ID técnico `app.lovable.d04adf9611f44dc9b79cf756a89ef084` é feio mas **funciona**. Para algo tipo `net.kebabturco.staff`:

1. Criar novo App ID na Apple
2. Alterar em `capacitor.config.ts` e no Xcode
3. Nova app iOS no Firebase + novo GoogleService-Info.plist

Só faça isto se quiser — não é obrigatório para publicar.

---

## Resumo

| Quem faz | O quê |
|----------|--------|
| **Comando no Mac** | Preparar código e abrir Xcode |
| **Você no site Apple** | App na loja, chave push, contratos |
| **Você no Firebase** | App iOS + ligação Apple |
| **Você no Xcode** | Assinatura, Archive, Upload |
| **Apple** | Revisão (1–3 dias) |

**Android (APK)** continua mais simples que iPhone. iPhone **sempre** passa por estes passos.
