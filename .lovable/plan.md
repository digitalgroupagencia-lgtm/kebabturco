# Plano: APK Capacitor com impressão direta + Wake Lock

## Objetivo
Gerar um APK Android (Capacitor) que:
- escuta novos pedidos em tempo real
- imprime direto na impressora ESC/POS (192.168.x.x:9100)
- mantém a tela do tablet sempre acesa enquanto o app estiver aberto
- não quebra PrintBridge das outras lojas (fallback automático)

Você vai instalar esse APK no tablet via cabo USB pelo seu Mac.

---

## O que vou fazer no código (automático, sem você editar nada)

1. **Instalar dependências Capacitor**
   - `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
   - `@capacitor-community/keep-awake` (Wake Lock — tela sempre acesa)
   - `capacitor-tcp-socket` já instalado ✓

2. **Ajustar `capacitor.config.ts`**
   - `appId`: `app.lovable.d04adf9611f44dc9b79cf756a89ef084`
   - `appName`: `kebabturco`
   - `server.url` apontando pro app publicado (`https://kebabturco.lovable.app`) — assim você não precisa rebuildar o APK toda vez que mudar algo no painel
   - `allowNavigation` pras faixas LAN da impressora

3. **Integrar Wake Lock no `App.tsx`**
   - Quando rodar em Android nativo, ativa `KeepAwake.keepAwake()` na inicialização
   - Tela do tablet nunca dorme enquanto o app está aberto

4. **Listener Android já existe** (`androidPrintListener.ts`)
   - Já escuta `print_jobs` via Realtime
   - Já abre socket TCP e manda ESC/POS
   - Já tem `drainPending` (puxa pedidos perdidos quando reabrir)
   - Já marca sucesso/erro no banco

5. **Botão "Testar impressão" no painel admin** já adaptado pro modo Android direto ✓

6. **Fila de impressão / reimpressão manual** já existe em `/admin/printer` ✓

---

## O que você vai fazer (passo a passo no Mac)

Tudo via terminal. Sem edição manual de arquivos.

### 1. Exportar para GitHub
- No Lovable, clicar em **GitHub → Connect to GitHub** (canto superior direito)
- Criar/conectar o repositório
- No Mac, abrir o terminal e:
```bash
git clone <url-do-seu-repo>
cd <pasta-do-projeto>
npm install
```

### 2. Adicionar plataforma Android (uma vez só)
```bash
npx cap add android
npx cap update android
```

### 3. Build + sync
```bash
npm run build
npx cap sync android
```

### 4. Abrir no Android Studio
```bash
npx cap open android
```
(Precisa ter Android Studio instalado — download grátis em developer.android.com/studio)

### 5. Conectar o tablet no Mac via cabo USB
- No tablet: ativar **Modo desenvolvedor** (Configurações → Sobre → tocar 7x em "Número da versão")
- Em Opções do desenvolvedor → ativar **Depuração USB**
- Conectar cabo USB e autorizar o Mac no popup do tablet

### 6. Instalar e rodar no tablet
- No Android Studio: selecionar o tablet no dropdown de dispositivos (topo)
- Clicar no botão ▶ **Run**
- O APK instala e abre sozinho no tablet

### 7. Configurar no painel admin
Pela web, em **Admin → Impressora** da loja Kebab Turco Gandia:
- Modo: **Android direto**
- IP da impressora: (o que está na etiqueta da impressora)
- Porta: `9100`
- Habilitado: ✅
- Clicar em **Imprimir teste** — deve sair ticket na impressora

### 8. Deixar o tablet pronto pro restaurante
- Tablet na tomada (carregador permanente)
- Wi-Fi conectado na mesma rede da impressora
- Login com usuário operador/cozinha da loja
- App aberto na tela de pedidos
- Wake Lock já cuida da tela ✓

---

## Atualizações futuras (sem reinstalar APK)

Como o `server.url` aponta pro app publicado, sempre que você fizer mudanças no Lovable e clicar em **Publish**, o tablet recebe a nova versão automaticamente ao reabrir o app. **Só precisa rebuildar o APK se mudar algo nativo** (plugin novo, permissão, ícone).

---

## Confirmações importantes

- **PrintBridge das outras lojas**: continua 100% intacto. O Android só age em lojas com `print_mode = 'android_direct'`.
- **PWA/web**: continua igual. Wake Lock e TCP são no-op no navegador.
- **KDS, painel, Stripe, caixa, fluxo de pedidos**: nada muda.

---

## Próximo passo

Aprove o plano e eu implemento as mudanças de código. Depois você só roda os 6 comandos no Mac.