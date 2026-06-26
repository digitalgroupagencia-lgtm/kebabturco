import type { DeployMode } from "./connectionsProfile";

export type ConnectionStep = {
  id: string;
  title: string;
  body: string;
  /** Onde colar o valor (Lovable secret, ficheiro, painel) */
  pasteHint?: string;
  /** Valor sugerido para copiar (já interpolado no UI) */
  copyLabel?: string;
  copyValueKey?: string;
  link?: string;
  linkLabel?: string;
  /** Ocultar se modo de deploy não incluir */
  showWhen?: DeployMode[];
  skipWhen?: DeployMode[];
};

export type ConnectionTab = {
  id: string;
  label: string;
  icon: string;
  intro: string;
  steps: ConnectionStep[];
};

export const CONNECTION_TABS: ConnectionTab[] = [
  {
    id: "projeto",
    label: "Projeto",
    icon: "store",
    intro:
      "Preencha o perfil do restaurante. Os nomes abaixo alimentam certificados Apple, Codemagic, Firebase e textos do checklist.",
    steps: [
      {
        id: "proj-1",
        title: "Definir modo de entrega",
        body: `Escolha como o restaurante vai usar a app:
• **App completa** — iPhone/Android nas lojas + tablet na cozinha.
• **Só tablet** — instalar APK/IPA no tablet do restaurante (Capacitor), sem subir à App Store / Play Store.
• **Só web** — site + PWA no browser; sem app nativa.`,
      },
      {
        id: "proj-2",
        title: "Nome comercial e slug",
        body: `Nome visível: **{{projectName}}**
Slug interno (certificados Codemagic, keystore): **{{projectSlug}}**
Domínio público: **{{domain}}**`,
      },
      {
        id: "proj-3",
        title: "Identificadores gerados",
        body: `iOS Bundle ID: \`{{iosBundleId}}\`
Android package: \`{{androidPackage}}\`
Certificado App Store (Codemagic ref): \`{{codemagicCertAppStore}}\`
Certificado Development: \`{{codemagicCertDev}}\`
Keystore Android: \`{{codemagicKeystore}}\``,
      },
    ],
  },
  {
    id: "lovable",
    label: "Lovable + Supabase",
    icon: "database",
    intro:
      "Cada restaurante novo precisa do seu projeto Lovable (remix ou novo) e base de dados Supabase separada. O remix copia o código, não as chaves nem a base.",
    steps: [
      {
        id: "lov-1",
        title: "Remix no Lovable (novo restaurante)",
        body: `No Lovable: **Remix** do projeto master ou duplicar repositório GitHub.
O remix traz o código; **não** traz Supabase, Stripe, Firebase nem contas Apple/Google.
Depois do remix: ligar GitHub ao novo repo e fazer **Publish** após cada alteração.`,
        link: "https://lovable.dev",
        linkLabel: "Abrir Lovable",
      },
      {
        id: "lov-2",
        title: "Criar projeto Supabase",
        body: `Criar projeto novo em supabase.com.
Anotar **Project ref**: \`{{supabaseProjectRef}}\`
URL: \`{{supabaseUrl}}\`
Correr scripts SQL do template (BOOTSTRAP + migrações) no SQL Editor.`,
        pasteHint: "Lovable → Settings → Secrets: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY",
        link: "{{supabaseDashboard}}",
        linkLabel: "Dashboard Supabase",
        copyValueKey: "supabaseProjectRef",
      },
      {
        id: "lov-3",
        title: "Secrets obrigatórios no Lovable",
        body: `Adicionar em Lovable → Cloud → Secrets (nomes exatos):
• \`VITE_SUPABASE_URL\` = \`{{supabaseUrl}}\`
• \`VITE_SUPABASE_PUBLISHABLE_KEY\` = chave anon do novo projeto
• \`SUPABASE_SERVICE_ROLE_KEY\` = service role (só servidor / edge functions)
• \`VITE_STRIPE_PUBLISHABLE_KEY\` = ver aba Stripe
• \`VITE_VAPID_PUBLIC_KEY\` = ver aba Web Push`,
        pasteHint: "Lovable Cloud → Secrets",
      },
      {
        id: "lov-4",
        title: "Edge functions e webhooks",
        body: `Após push para \`lovable/main\`, as edge functions fazem deploy automático.
Configurar webhooks Stripe e cron no Supabase conforme documentação do template.
Tenant inicial: criar registo em \`tenants\` com slug \`{{projectSlug}}\`.`,
      },
      {
        id: "lov-5",
        title: "Git remotes (sync)",
        body: `Repo GitHub: \`{{githubUrl}}\`
Remotes habituais:
• \`origin\` → GitHub principal
• \`lovable\` → remote Lovable (URL gerada no remix)
Publicar: push para \`origin/main\` e \`lovable/main\`, depois **Publish** no Lovable.`,
        copyValueKey: "githubUrl",
      },
    ],
  },
  {
    id: "stripe",
    label: "Stripe",
    icon: "credit-card",
    intro: "Pagamentos online, Connect para repasse e webhooks. Conta Stripe separada por restaurante (ou Connect sub-conta).",
    steps: [
      {
        id: "str-1",
        title: "Conta Stripe",
        body: `Criar conta em dashboard.stripe.com (modo Test primeiro).
Ativar **Connect** se o restaurante recebe pagamentos na própria conta.`,
        link: "https://dashboard.stripe.com",
        linkLabel: "Stripe Dashboard",
      },
      {
        id: "str-2",
        title: "Chaves publishable e secret",
        body: `Developers → API keys:
• Publishable → Lovable secret \`VITE_STRIPE_PUBLISHABLE_KEY\`
• Secret → Lovable \`STRIPE_SECRET_KEY\` (nunca no frontend)`,
        pasteHint: "Lovable: VITE_STRIPE_PUBLISHABLE_KEY + STRIPE_SECRET_KEY",
      },
      {
        id: "str-3",
        title: "Webhook",
        body: `Developers → Webhooks → endpoint:
\`{{supabaseUrl}}/functions/v1/stripe-webhook\`
Eventos: payment_intent.*, checkout.session.completed, account.updated (Connect).
Copiar **Signing secret** → Lovable \`STRIPE_WEBHOOK_SECRET\`.`,
        pasteHint: "Lovable: STRIPE_WEBHOOK_SECRET",
      },
      {
        id: "str-4",
        title: "Apple Pay / Google Pay (web)",
        body: `Stripe → Settings → Payment methods: ativar Apple Pay e Google Pay.
Domínio \`{{domain}}\` tem de estar verificado no Stripe.`,
        skipWhen: ["web-only"],
      },
      {
        id: "str-5",
        title: "Tap to Pay no iPhone (opcional)",
        body: `Requer app nativa iOS + entitlement Apple + Stripe Terminal SDK.
Só para restaurantes com iPhone na loja; seguir doc Stripe Tap to Pay.`,
        showWhen: ["full-native"],
      },
    ],
  },
  {
    id: "firebase",
    label: "Firebase / FCM",
    icon: "flame",
    intro: "Push Android (FCM) e configuração google-services. iOS usa APNs direto (aba Apple).",
    steps: [
      {
        id: "fb-1",
        title: "Projeto Firebase",
        body: `console.firebase.google.com → criar projeto **{{firebaseProjectId}}** (ou nome derivado de {{projectName}}).
Adicionar app Android com package \`{{androidPackage}}\`.
Adicionar app iOS com bundle \`{{iosBundleId}}\` (se app nativa).`,
        link: "https://console.firebase.google.com",
        linkLabel: "Firebase Console",
      },
      {
        id: "fb-2",
        title: "google-services.json",
        body: `Descarregar \`google-services.json\` e colocar em:
\`android/app/google-services.json\`
Commit + push antes do build Codemagic Android.`,
        pasteHint: "android/app/google-services.json",
        skipWhen: ["web-only"],
      },
      {
        id: "fb-3",
        title: "GoogleService-Info.plist (iOS)",
        body: `Descarregar plist e colocar em \`ios/App/App/GoogleService-Info.plist\` se usar Firebase Analytics; push iOS usa APNs na mesma.`,
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "fb-4",
        title: "Service Account FCM",
        body: `Firebase → Project settings → Service accounts → Generate new private key.
JSON completo → Supabase secret \`FCM_SERVICE_ACCOUNT_JSON\` (edge function send-push).`,
        pasteHint: "Supabase Edge Functions secrets: FCM_SERVICE_ACCOUNT_JSON",
      },
    ],
  },
  {
    id: "apple",
    label: "Apple + Codemagic",
    icon: "apple",
    intro: "App Store, TestFlight, push APNs e builds iOS via Codemagic.",
    steps: [
      {
        id: "ap-1",
        title: "Apple Developer Program",
        body: `Conta ativa em developer.apple.com.
Team: **{{appleTeamName}}** — ID \`{{appleTeamId}}\`.`,
        link: "https://developer.apple.com/account",
        linkLabel: "Apple Developer",
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "ap-2",
        title: "App ID e app na App Store Connect",
        body: `Identifiers → App ID: \`{{iosBundleId}}\`
App Store Connect → Apps → criar app **{{projectName}}**
SKU sugerido: \`{{projectSlug}}\`
Ativar Push Notifications e Apple Pay se necessário.`,
        copyValueKey: "iosBundleId",
        showWhen: ["full-native"],
      },
      {
        id: "ap-3",
        title: "Perfis de provisionamento",
        body: `Profiles:
• **{{appleProfileAppStore}}** — distribuição App Store
• **{{appleProfileDev}}** — desenvolvimento / TestFlight interno
Nomes no Codemagic: refs \`{{codemagicCertAppStore}}\` e \`{{codemagicCertDev}}\`.`,
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "ap-4",
        title: "Chave APNs (.p8)",
        body: `Keys → Apple Push Notifications → criar chave.
Anotar Key ID e Team ID.
Conteúdo .p8 → Supabase secrets:
\`APNS_KEY_ID\`, \`APNS_TEAM_ID\`, \`APNS_PRIVATE_KEY\`, \`APNS_BUNDLE_ID={{iosBundleId}}\``,
        pasteHint: "Supabase secrets APNS_*",
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "ap-5",
        title: "Codemagic — integração Apple",
        body: `codemagic.io → Teams → Integrations → Apple Developer Portal.
Nome da integração: **{{codemagicIntegration}}**
Ligar certificados com refs \`{{codemagicCertAppStore}}\` e \`{{codemagicCertDev}}\`.`,
        link: "https://codemagic.io/apps",
        linkLabel: "Codemagic",
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "ap-6",
        title: "Codemagic — workflow iOS",
        body: `Repo \`{{githubUrl}}\`, branch \`main\`, ficheiro \`codemagic.yaml\`.
Variáveis de ambiente no workflow: \`IOS_BUNDLE_ID={{iosBundleId}}\`.
App abre \`https://{{domain}}\` (modelo remoto, não embutir web no IPA).
Build → TestFlight → revisão App Store.`,
        copyValueKey: "githubUrl",
        showWhen: ["full-native"],
      },
      {
        id: "ap-7",
        title: "IPA só para tablet (sem loja)",
        body: `Workflow development/ad-hoc ou instalação enterprise.
Instalar IPA no iPad da cozinha via Apple Configurator ou link interno.
Mesmo bundle \`{{iosBundleId}}\`, perfil Development.`,
        showWhen: ["tablet-capacitor"],
      },
    ],
  },
  {
    id: "google",
    label: "Google Play",
    icon: "play",
    intro: "Publicação Android e builds via Codemagic.",
    steps: [
      {
        id: "gp-1",
        title: "Play Console",
        body: `play.google.com/console → criar app **{{projectName}}**.
Package name: \`{{androidPackage}}\` (irreversível).`,
        link: "https://play.google.com/console",
        linkLabel: "Play Console",
        showWhen: ["full-native"],
      },
      {
        id: "gp-2",
        title: "Keystore Android",
        body: `Gerar keystore (guardar passwords em cofre).
Upload no Codemagic → Code signing → Android keystore.
Reference name: **{{codemagicKeystore}}**`,
        copyValueKey: "codemagicKeystore",
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "gp-3",
        title: "Codemagic workflow Android",
        body: `Workflow android-release em \`codemagic.yaml\`.
\`applicationId\` = \`{{androidPackage}}\`.
Artifact: AAB para Play ou APK para tablet direto.`,
        showWhen: ["full-native", "tablet-capacitor"],
      },
      {
        id: "gp-4",
        title: "APK no tablet (sem Play Store)",
        body: `Build APK release no Codemagic.
Transferir para tablet (USB, email interno, MDM).
Ativar «Fontes desconhecidas» / instalação empresarial.
App abre \`https://{{domain}}\`.`,
        showWhen: ["tablet-capacitor"],
      },
      {
        id: "gp-5",
        title: "Play App Signing",
        body: `Na primeira submissão, Google gere chave de assinatura.
Guardar upload key; Codemagic usa keystore \`{{codemagicKeystore}}\`.`,
        showWhen: ["full-native"],
      },
    ],
  },
  {
    id: "webpush",
    label: "Web Push",
    icon: "bell",
    intro: "Notificações no browser (staff e clientes PWA).",
    steps: [
      {
        id: "wp-1",
        title: "Gerar par VAPID",
        body: `Correr no terminal (ou usar gerador web):
\`npx web-push generate-vapid-keys\`
Public key → Lovable \`VITE_VAPID_PUBLIC_KEY\`
Private key → Supabase \`VAPID_PRIVATE_KEY\``,
        pasteHint: "VITE_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY",
      },
      {
        id: "wp-2",
        title: "Service worker",
        body: `Ficheiros \`public/push-handler.js\` e \`public/sw.js\` já no projeto.
Domínio \`{{domain}}\` deve servir HTTPS.`,
      },
    ],
  },
  {
    id: "tablet",
    label: "Tablet Capacitor",
    icon: "tablet",
    intro: "Restaurantes sem lojas: app nativa mínima que abre o site — ideal para cozinha e POS.",
    steps: [
      {
        id: "tab-1",
        title: "Quando usar este modo",
        body: `Ativar **Só tablet** no perfil do projeto.
Não precisa App Store nem Play Store públicos.
Precisa mesma stack: Supabase, Stripe, push (opcional), domínio HTTPS.`,
      },
      {
        id: "tab-2",
        title: "Configurar Capacitor",
        body: `Em \`capacitor.config.ts\`: \`server.url\` = \`https://{{domain}}\`
iOS: \`{{iosBundleId}}\` — Android: \`{{androidPackage}}\`
Build local: \`npm run build && npx cap sync\``,
        skipWhen: ["web-only"],
      },
      {
        id: "tab-3",
        title: "Instalação no tablet Android",
        body: `APK release (Codemagic ou \`./gradlew assembleRelease\`).
Instalar no tablet do restaurante; manter Wi‑Fi estável.
Atalho no ecrã inicial; kiosk mode opcional (Fully Kiosk, etc.).`,
        showWhen: ["tablet-capacitor", "full-native"],
      },
      {
        id: "tab-4",
        title: "Instalação no iPad",
        body: `IPA ad-hoc/TestFlight interno ou Apple Business Manager.
Mesmo URL remoto \`https://{{domain}}\`.`,
        showWhen: ["tablet-capacitor", "full-native"],
      },
      {
        id: "tab-5",
        title: "Alertas sonoros staff",
        body: `Som de novo pedido: \`staff_order_alert.caf\` (iOS) já no projeto.
Push staff: registar dispositivo no painel após login.`,
      },
    ],
  },
  {
    id: "cursor",
    label: "Cursor + GitHub",
    icon: "terminal",
    intro: "Ligar o novo projeto ao Cursor para o agente ajudar com código, push e checklist.",
    steps: [
      {
        id: "cur-1",
        title: "Clonar repositório",
        body: `git clone {{githubUrl}}
cd {{githubRepo}}
npm install`,
        copyValueKey: "githubUrl",
      },
      {
        id: "cur-2",
        title: "Remotes Lovable",
        body: `git remote add lovable <URL do remix Lovable>
git push -u origin main
git push lovable main`,
      },
      {
        id: "cur-3",
        title: "Abrir no Cursor",
        body: `File → Open Folder → pasta do projeto.
Regras em \`.cursor/rules/\` (sync Lovable, publish).
Pedir ao agente: «configura secrets», «novo tenant», «build Codemagic».`,
      },
      {
        id: "cur-4",
        title: "Ficheiros a atualizar no remix",
        body: `Personalizar: nome app, logos (white-label assets), \`capacitor.config.ts\`, bundle IDs em \`ios/App\` e \`android/app/build.gradle\`, domínio em boot scripts, tenant slug na base.`,
      },
      {
        id: "cur-5",
        title: "Ordem recomendada",
        body: `1. Perfil projeto → 2. Supabase + SQL → 3. Lovable secrets → 4. Stripe → 5. Domínio → 6. Firebase/APNs → 7. Codemagic → 8. Testes → 9. Lojas ou tablet.`,
      },
    ],
  },
  {
    id: "dominio",
    label: "Domínio",
    icon: "globe",
    intro: "DNS e HTTPS para o site e para a app abrir o URL correto.",
    steps: [
      {
        id: "dom-1",
        title: "Domínio principal",
        body: `Registar ou apontar **{{domain}}** para o hosting Lovable/Vercel.
Site cliente: \`https://{{domain}}\`
Painel staff: \`https://{{domain}}/panel\``,
        copyValueKey: "siteUrl",
      },
      {
        id: "dom-2",
        title: "SSL",
        body: `HTTPS obrigatório (Stripe, push, Capacitor remote URL).
Verificar certificado ativo antes de TestFlight.`,
      },
      {
        id: "dom-3",
        title: "Deep links push",
        body: `Notificações usam URLs \`https://{{domain}}/?screen=...\`
Testar toque em cupão, fidelização e produto após publish.`,
      },
    ],
  },
];

export function filterStepsForDeployMode(
  steps: ConnectionStep[],
  mode: DeployMode,
): ConnectionStep[] {
  return steps.filter((s) => {
    if (s.skipWhen?.includes(mode)) return false;
    if (s.showWhen && !s.showWhen.includes(mode)) return false;
    return true;
  });
}

export const REMIX_FAQ = {
  title: "Remix Lovable para outro restaurante",
  points: [
    "O **Remix** no Lovable cria um projeto novo com cópia do código — rápido para começar.",
    "**Não copia** automaticamente: base Supabase, chaves Stripe, Firebase, Apple, Google, domínio nem certificados.",
    "Depois do remix: novo Supabase, novas secrets no Lovable, novas contas externas — use este checklist.",
    "Alternativa escala: **multi-tenant** (vários restaurantes na mesma base) — menos remix, mais isolamento por tenant.",
    "Para vender muitos: manter um **projeto master** no GitHub; cada cliente = remix + perfil preenchido aqui + Publish.",
  ],
};
