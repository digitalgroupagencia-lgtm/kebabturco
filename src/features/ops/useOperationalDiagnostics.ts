import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { checkBridgeStatus } from "@/services/printerService";
import { CUSTOMER_MARKETING_PUSH_TAG } from "@/lib/customerMarketingPush";
import { nav } from "@/lib/navPaths.ts";
import {
  fetchDbOperationalDiagnostics,
  fetchServerOperationalDiagnostics,
  probeCheckoutStripeRpc,
  probeSchemaFallback,
} from "@/services/operationalDiagnosticsService";
import { fetchStoreFinancialProfile, type StoreFinancialProfile } from "@/services/orderService";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";
import { KEBAB_FALLBACK_STORE_ID } from "@/lib/storeResolution";
import { fetchStorePayoutIntake } from "@/services/payoutIntakeService";
import { APP_BUILD_ID, GIT_SHA, isRunningLatestPublishedVersion } from "@/lib/appCacheBust";

export type DiagnosticStatus = "ok" | "warn" | "fail" | "pending";

export type DiagnosticItem = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
  /** O que fazer — linguagem simples para o dono do restaurante */
  action?: string;
  critical?: boolean;
  link?: string;
  linkLabel?: string;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

import { hasStripePublishableKey, stripePublishableTestKeySource } from "@/lib/stripePublishableKey";

export function useOperationalDiagnostics() {
  const { storeId } = useAdminStoreId();
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async (): Promise<DiagnosticItem[]> => {
    setRunning(true);
    const results: DiagnosticItem[] = [];

    const auditStoreId = storeId ?? KEBAB_FALLBACK_STORE_ID;

    // Sincroniza o estado real da Stripe ANTES de auditar (evita falsos "em análise").
    try {
      await supabase.functions.invoke("stripe-connect-onboard", {
        body: { mode: "sync_status", storeId: auditStoreId },
      });
    } catch {
      /* ignora — não bloqueia a auditoria */
    }

    const [dbDiag, serverDiag, schemaProbe, storeProfile, payoutIntake, checkoutRpc] = await Promise.all([
      fetchDbOperationalDiagnostics(auditStoreId),
      fetchServerOperationalDiagnostics(auditStoreId),
      probeSchemaFallback(),
      fetchStoreFinancialProfile(auditStoreId),
      fetchStorePayoutIntake(auditStoreId),
      probeCheckoutStripeRpc(),
    ]);

    const buildServerStoreProfile = (): StoreFinancialProfile | null => {
      if (!serverDiag?.store) return null;
      return {
        stripe_connect_account_id: serverDiag.store.stripe_connect_account_id,
        stripe_connect_environment: serverDiag.store.stripe_connect_environment ?? null,
        stripe_connect_test_simulated: Boolean(serverDiag.store.stripe_connect_test_simulated),
        stripe_charges_enabled: Boolean(serverDiag.store.stripe_charges_enabled),
        stripe_onboarding_completed: Boolean(serverDiag.store.stripe_onboarding_completed),
        stripe_payouts_enabled: Boolean(serverDiag.store.stripe_payouts_enabled),
        stripe_iban_last4: null,
        stripe_business_name: null,
        stripe_payout_status: "",
        stripe_last_payout_at: null,
      };
    };

    const mergedStripeProfile = storeProfile ?? buildServerStoreProfile();
    const stripeConnectReady = isStripeConnectReady(mergedStripeProfile);

    const schemaQr = dbDiag?.schema_qr_token ?? schemaProbe.schema_qr_token;
    const schemaPrint = dbDiag?.schema_kitchen_print ?? schemaProbe.schema_kitchen_print;
    const schemaStripeEnv = schemaProbe.schema_stripe_connect_environment;
    const schemaTestSimulated = schemaProbe.schema_stripe_connect_test_simulated;
    const schemaValidated = dbDiag?.schema_table_validated ?? true;
    const rpcReady =
      dbDiag != null &&
      dbDiag.rpc_claim_kitchen_print &&
      dbDiag.rpc_mark_paid_counter &&
      dbDiag.rpc_regenerate_qr;

    // BASE DE DADOS
    if (!dbDiag && (!schemaQr || !schemaPrint)) {
      results.push({
        id: "database",
        label: "Base de dados",
        status: "fail",
        critical: true,
        detail: "Faltam actualizações na base de dados — mesas QR, impressão única e caixa podem falhar.",
        action: "Lovable → Database → SQL editor → cole o SQL completo (Admin → Recebimentos → Copiar SQL). Depois actualize esta página.",
      });
    } else if (!schemaQr || !schemaPrint || !schemaValidated || !rpcReady) {
      const missing: string[] = [];
      if (!schemaQr) missing.push("QR das mesas");
      if (!schemaValidated) missing.push("validação de mesa");
      if (!schemaPrint) missing.push("impressão única");
      if (!rpcReady) missing.push("funções de caixa");
      results.push({
        id: "database",
        label: "Base de dados",
        status: "fail",
        critical: true,
        detail: `Actualização incompleta: falta ${missing.join(", ")}.`,
        action:
          "Lovable → Database → SQL editor → cole o SQL de Admin → Recebimentos (botão Copiar SQL). Depois Sync + Publish.",
      });
    } else {
      results.push({
        id: "database",
        label: "Base de dados",
        status: "ok",
        detail: "Actualizações de mesa, pagamento e impressão estão aplicadas.",
      });
    }

    if (!schemaStripeEnv) {
      results.push({
        id: "stripe-connect-environment-col",
        label: "Modo teste/produção (base de dados)",
        status: "fail",
        critical: true,
        detail:
          "Falta actualização que guarda se a conta do restaurante está em teste ou produção — pagamentos podem usar a chave errada.",
        action:
          "Lovable → Database → SQL editor → cole o SQL completo de Admin → Recebimentos.",
      });
    } else {
      results.push({
        id: "stripe-connect-environment-col",
        label: "Modo teste/produção (base de dados)",
        status: "ok",
        detail: "Base de dados preparada para alternar teste e produção por restaurante.",
      });
    }

    if (!schemaTestSimulated) {
      results.push({
        id: "stripe-connect-test-simulated-col",
        label: "Recebimentos simulados (base de dados)",
        status: "fail",
        critical: true,
        detail: "Falta actualização para activar recebimentos de teste com um clique.",
        action: "Lovable → Database → SQL editor → cole o SQL completo de Admin → Recebimentos.",
      });
    } else {
      results.push({
        id: "stripe-connect-test-simulated-col",
        label: "Recebimentos simulados (base de dados)",
        status: "ok",
        detail: "Base de dados preparada para recebimentos de teste simulados.",
      });
    }

    // MESAS QR
    if (schemaQr && storeId) {
      const missing = dbDiag?.tables_missing_qr_token ?? 0;
      const active = dbDiag?.active_tables ?? 0;
      if (active === 0) {
        results.push({
          id: "tables-qr",
          label: "QR das mesas",
          status: "warn",
          critical: true,
          detail: "Nenhuma mesa activa — clientes não conseguem pedir na mesa.",
          action: "Vá a Mesas no painel, crie as mesas e imprima o QR de cada uma.",
        });
      } else if (missing > 0) {
        results.push({
          id: "tables-qr",
          label: "QR das mesas",
          status: "fail",
          critical: true,
          detail: `${missing} mesa(s) activa(s) sem QR válido.`,
          action: "Abra Mesas → em cada mesa clique Regenerar QR e imprima o código novo.",
        });
      } else {
        results.push({
          id: "tables-qr",
          label: "QR das mesas",
          status: "ok",
          detail: `${active} mesa(s) activa(s) com QR válido.`,
        });
      }
    }

    // STRIPE — chave pública no site (Lovable / config pública do projecto)
    const hasLivePk = hasStripePublishableKey("live");
    const hasTestPk = hasStripePublishableKey("test");
    if (!hasLivePk && !hasTestPk) {
      results.push({
        id: "stripe-site-key",
        label: "Pagamentos online (site)",
        status: "fail",
        critical: true,
        detail: "Chaves publicáveis da Stripe em falta no site — o cliente não vê cartão.",
        action:
          "Sync + Publish na Lovable. A chave live já está no projecto; para testes, cole pk_test_... em config/stripe.public.env.",
      });
    } else if (!hasLivePk && hasTestPk) {
      results.push({
        id: "stripe-site-key",
        label: "Pagamentos online (site)",
        status: "warn",
        detail: "Chave de teste activa — checkout simulado. Produção usa pk_live quando a plataforma for aprovada.",
        action:
          stripePublishableTestKeySource() === "env"
            ? undefined
            : "Cole a pk_test em config/stripe.public.env (não vai para Segredos).",
      });
    } else {
      results.push({
        id: "stripe-site-key",
        label: "Pagamentos online (site)",
        status: "ok",
        detail: hasTestPk
          ? "Chaves live e teste activas — checkout usa teste ou produção conforme o modo."
          : "Chave publicável live activa — cartão e Apple/Google Pay podem aparecer no checkout.",
      });
    }

    // STRIPE — chave secreta (servidor)
    if (serverDiag == null) {
      if (stripeConnectReady && checkoutRpc) {
        results.push({
          id: "stripe-server",
          label: "Pagamentos online (servidor)",
          status: "ok",
          detail: "Recebimentos online activos (auditoria do servidor não disponível neste momento).",
        });
      } else {
        results.push({
          id: "stripe-server",
          label: "Pagamentos online (servidor)",
          status: "warn",
          critical: false,
          detail: "Não foi possível verificar o servidor — a função de diagnóstico pode não estar activa.",
          action: "Na Lovable: «Deploy all edge functions» (ou «Deploy stripe-create-payment-intent»). Depois Sync + Publish.",
        });
      }
    } else if (!serverDiag.stripeSecretKey) {
      results.push({
        id: "stripe-server",
        label: "Pagamentos online (servidor)",
        status: "fail",
        critical: true,
        detail: "Chave secreta da Stripe em falta no servidor Lovable Cloud.",
        action:
          "Lovable → Cloud → Secrets → adicionar STRIPE_SECRET_KEY (chave secreta da Stripe, sk_live_... ou sk_test_...). Se já ligou Stripe nas Integrações, peça no chat: «Sync Stripe secret to edge functions».",
      });
    } else {
      results.push({
        id: "stripe-server",
        label: "Pagamentos online (servidor)",
        status: "ok",
        detail: "Chave secreta da Stripe configurada no servidor.",
      });
    }

    const platform = serverDiag?.platform;
    const storeConnectEnv =
      (storeProfile?.stripe_connect_environment as "live" | "test" | undefined) ??
      (serverDiag?.store?.stripe_connect_environment as "live" | "test" | undefined) ??
      "live";
    const productionBlocked = Boolean(platform?.productionBlocked);
    const testKeysOnServer = Boolean(serverDiag?.stripeSecretKeyTest ?? platform?.testKeysConfigured);

    if (serverDiag && platform?.productionBlocked) {
      results.push({
        id: "stripe-platform-verification",
        label: "Plataforma live",
        status: "warn",
        critical: false,
        detail: "Pendente de validação de identidade na Stripe — pagamentos reais bloqueados.",
        action: testKeysOnServer
          ? "Use «Activar recebimentos de teste» em Recebimentos para validar o checkout."
          : "Configure chaves de teste no servidor e a chave publicável de teste no site.",
      });
      results.push({
        id: "stripe-test-mode",
        label: "Modo teste",
        status: testKeysOnServer && hasTestPk ? "ok" : "warn",
        detail: testKeysOnServer
          ? hasTestPk
            ? "Modo teste activo — chaves de teste configuradas."
            : "Servidor pronto para teste — falta chave publicável de teste no site."
          : "Chaves de teste em falta no servidor.",
        action: !hasTestPk
          ? "Cole pk_test_... em config/stripe.public.env e faça Sync + Publish."
          : undefined,
      });
    } else if (serverDiag && platform && !platform.productionBlocked) {
      results.push({
        id: "stripe-platform-verification",
        label: "Plataforma Stripe (verificação)",
        status: "ok",
        detail: "Plataforma aprovada — contas live e pagamentos reais permitidos.",
      });
    }

    if (serverDiag) {
      if (storeConnectEnv === "test") {
        results.push({
          id: "stripe-connect-mode",
          label: "Modo Stripe Connect",
          status: "warn",
          detail: "Modo teste — checkout e split simulados, sem dinheiro real.",
          action: productionBlocked
            ? "Produção bloqueada até a Stripe aprovar a plataforma."
            : undefined,
        });
      } else if (productionBlocked && testKeysOnServer) {
        results.push({
          id: "stripe-connect-mode",
          label: "Modo Stripe Connect",
          status: "warn",
          detail: "Produção bloqueada — testes disponíveis com chaves de teste.",
          action: "Admin → Recebimentos → Conectar recebimentos (modo teste).",
        });
      } else if (!productionBlocked) {
        results.push({
          id: "stripe-connect-mode",
          label: "Modo Stripe Connect",
          status: "ok",
          detail: "Modo produção — pagamentos reais activos.",
        });
      }
    }

    if (serverDiag?.stripeSecretKey || serverDiag?.stripeSecretKeyTest) {
      results.push({
        id: "stripe-connect-configured",
        label: "Stripe Connect configurado",
        status: "ok",
        detail: "Servidor preparado para onboarding embebido, checkout com split e taxa online.",
      });
    }

    if (!checkoutRpc) {
      results.push({
        id: "stripe-checkout-rpc",
        label: "Pagamentos no totem (base de dados)",
        status: "fail",
        critical: true,
        detail:
          "Falta actualização que liga o totem à conta Stripe — o cliente vê «pagamentos não activos» mesmo com Stripe correcta.",
        action: "Admin → Recebimentos → Copiar SQL de activação → executar no editor da base de dados → Sync + Publish.",
      });
    } else {
      results.push({
        id: "stripe-checkout-rpc",
        label: "Pagamentos no totem (base de dados)",
        status: "ok",
        detail: "Base de dados preparada para o totem saber se cartão está activo.",
      });
    }

    // STRIPE Connect — conta restaurante (mesma regra que Finanças / totem)
    const mergedProfile = mergedStripeProfile;
    const connectReady = stripeConnectReady;
    const hasConnect = Boolean(mergedProfile?.stripe_connect_account_id);
    const payoutsOk = Boolean(mergedProfile?.stripe_payouts_enabled);

    const testSimulated = Boolean(mergedProfile?.stripe_connect_test_simulated);

    const intakeSubmitted = Boolean(payoutIntake?.submitted_at);
    const awaitingReview = hasConnect && intakeSubmitted && !connectReady;

    if (connectReady) {
      results.push({
        id: "stripe-connect",
        label: "Conta bancária (recebimentos)",
        status: "ok",
        detail: testSimulated
          ? "Conta Connect de teste simulada — checkout disponível, sem dinheiro real."
          : storeConnectEnv === "test"
            ? "Conta Connect de teste criada — recebimentos simulados activos."
            : payoutsOk
              ? "Recebimentos online e repasse bancário activos."
              : "Pagamentos online activos — repasse bancário em validação.",
        action: payoutsOk ? undefined : "Admin → Recebimentos → Gerir conta bancária se necessário.",
      });
    } else if (awaitingReview) {
      results.push({
        id: "stripe-connect",
        label: "Conta bancária (recebimentos)",
        status: "warn",
        critical: false,
        detail:
          "Dados já enviados — conta em análise. Pagamentos online ficam activos quando a aprovação terminar.",
        action: "Admin → Recebimentos → acompanhar estado ou reenviar link por WhatsApp.",
      });
    } else {
      results.push({
        id: "stripe-connect",
        label: "Conta bancária (recebimentos)",
        status: productionBlocked && testKeysOnServer ? "warn" : "fail",
        critical: !(productionBlocked && testKeysOnServer),
        detail: !hasConnect
          ? productionBlocked && testKeysOnServer
            ? "Conta do restaurante ainda não criada — pode activar em modo teste."
            : productionBlocked
              ? "Conta do restaurante não criada — produção bloqueada até aprovação da plataforma."
              : "Recebimentos online ainda não foram activados."
          : "Dados bancários ou documentos incompletos — pagamentos online bloqueados.",
        action:
          productionBlocked && testKeysOnServer
            ? "Admin → Recebimentos → Activar recebimentos de teste."
            : checkoutRpc
              ? "Admin → Recebimentos → Sincronizar com Stripe. Se continuar: Copiar SQL de activação."
              : "Admin → Recebimentos → Copiar SQL de activação → executar na base de dados.",
      });
    }

    if (productionBlocked && testKeysOnServer) {
      const checkoutTestReady = connectReady && hasTestPk;
      results.push({
        id: "stripe-test-checkout",
        label: "Checkout teste",
        status: checkoutTestReady ? "ok" : "warn",
        detail: checkoutTestReady
          ? "Disponível — pode pagar com cartão 4242 4242 4242 4242."
          : "Indisponível — active recebimentos de teste e configure pk_test no site.",
        action: checkoutTestReady
          ? undefined
          : "Recebimentos → Activar recebimentos de teste + pk_test no site.",
      });
      results.push({
        id: "stripe-production-blocked",
        label: "Produção",
        status: "warn",
        detail: "Bloqueada até a Stripe aprovar a identidade da plataforma — dinheiro real não movimentado.",
      });
    }

    // WEBHOOK
    if (serverDiag) {
      const needsTestWebhook = storeConnectEnv === "test" || (productionBlocked && testKeysOnServer);
      if (!serverDiag.stripeWebhookSecret) {
        results.push({
          id: "stripe-webhook-secret",
          label: "Webhook Stripe (servidor)",
          status: "fail",
          critical: true,
          detail: "Segredo do webhook live em falta — pagamentos reais podem não confirmar automaticamente.",
          action: "No Supabase → Secrets → adicione STRIPE_WEBHOOK_SECRET (valor da Stripe, modo live).",
        });
      } else {
        results.push({
          id: "stripe-webhook-secret",
          label: "Webhook Stripe (servidor)",
          status: "ok",
          detail: "Segredo do webhook live configurado.",
        });
      }

      if (needsTestWebhook && !serverDiag.stripeWebhookSecretTest) {
        results.push({
          id: "stripe-webhook-secret-test",
          label: "Webhook Stripe (teste)",
          status: "warn",
          detail: "Segredo do webhook de teste em falta — pagamentos simulados podem não confirmar sozinhos.",
          action:
            "Na Stripe (modo teste) → Webhooks → mesma URL → copie o segredo para STRIPE_WEBHOOK_SECRET_TEST nos Segredos Lovable.",
        });
      } else if (needsTestWebhook && serverDiag.stripeWebhookSecretTest) {
        results.push({
          id: "stripe-webhook-secret-test",
          label: "Webhook Stripe (teste)",
          status: "ok",
          detail: "Segredo do webhook de teste configurado.",
        });
      }

      if (!serverDiag.webhookConfigured) {
        const supaUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
        const webhookUrl = supaUrl ? `${supaUrl}/functions/v1/stripe-webhook` : serverDiag.webhookExpectedUrl;
        results.push({
          id: "stripe-webhook-active",
          label: "Webhook Stripe (ligação)",
          status: "fail",
          critical: true,
          detail: "A Stripe ainda não avisa o servidor quando um pagamento é confirmado.",
          action: `Na Stripe → Developers → Webhooks → Add endpoint → URL: ${webhookUrl} → eventos: payment_intent.succeeded, charge.dispute.created, account.updated, payout.paid, payout.failed`,
        });
      } else {
        results.push({
          id: "stripe-webhook-active",
          label: "Webhook Stripe (ligação)",
          status: "ok",
          detail: "Webhook activo na Stripe — confirmação automática de pagamentos.",
        });
      }
    }

    // FUNÇÕES SERVIDOR
    if (serverDiag) {
      const verifyOk =
        serverDiag.edgeFunctions["stripe-verify-payment-intent"] ||
        serverDiag.edgeFunctions["stripe-create-payment-intent"];
      const diagOk =
        serverDiag.edgeFunctions["operational-diagnostics"] ||
        serverDiag.edgeFunctions["stripe-create-payment-intent"];
      const missingFns: string[] = [];
      if (!serverDiag.edgeFunctions["stripe-create-payment-intent"]) missingFns.push("criar pagamento");
      if (!verifyOk) missingFns.push("confirmar pagamento");
      if (!serverDiag.edgeFunctions["print-order"]) missingFns.push("imprimir pedido");
      if (!serverDiag.edgeFunctions["stripe-webhook"]) missingFns.push("avisos da Stripe");
      if (!diagOk) missingFns.push("diagnóstico do servidor");

      if (missingFns.length) {
        results.push({
          id: "edge-functions",
          label: "Serviços do servidor",
          status: "fail",
          critical: true,
          detail: `Serviços em falta: ${missingFns.join(", ")}.`,
          action:
            "Lovable → Deploy edge functions. Para a base de dados, cole o SQL em Admin → Recebimentos. Depois Sync + Publish.",
        });
      } else {
        results.push({
          id: "edge-functions",
          label: "Serviços do servidor",
          status: "ok",
          detail: "Todos os serviços de pagamento e impressão estão activos.",
        });
      }
    }

    // VERSÃO PUBLICADA
    try {
      const version = await isRunningLatestPublishedVersion();
      if (!version.remote) {
        // /version.json indisponível neste host (ex.: custom domain sem o ficheiro). Não é erro.
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "ok",
          detail: `Versão local em uso (${GIT_SHA.slice(0, 7)}). Comparação remota indisponível neste domínio.`,
        });
      } else if (version.ok) {
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "ok",
          detail: `Site actualizado (${GIT_SHA.slice(0, 7)}).`,
        });
      } else {
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "fail",
          critical: true,
          detail: "Está a ver uma versão antiga do site.",
          action: "Lovable → Sync + Publish. Limpe cache do browser ou reinstale a app no telemóvel.",
        });
      }
    } catch {
      results.push({
        id: "deploy",
        label: "Versão publicada",
        status: "ok",
        detail: "Versão actual em uso.",
      });
    }

    // LOJA PÚBLICA
    try {
      const { data, error } = await supabase.from("stores_public").select("id, name").limit(1);
      if (error || !data?.length) {
        results.push({
          id: "production",
          label: "Loja online",
          status: error ? "fail" : "warn",
          critical: Boolean(error),
          detail: error ? `Loja inacessível: ${error.message}` : "Nenhuma loja pública encontrada.",
          action: error ? "Verifique ligação Supabase na Lovable." : "Active a loja no admin.",
        });
      } else {
        results.push({
          id: "production",
          label: "Loja online",
          status: "ok",
          detail: `Loja activa: ${data[0].name || "Kebab Turco"}.`,
        });
      }
    } catch (e) {
      results.push({
        id: "production",
        label: "Loja online",
        status: "fail",
        critical: true,
        detail: e instanceof Error ? e.message : "Erro de rede",
      });
    }

    // TEMPO REAL
    if (storeId) {
      const realtimeOk = await new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => resolve(false), 6000);
        const channel = supabase
          .channel(`diag-orders-${storeId}-${Date.now()}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
            () => {},
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              window.clearTimeout(timer);
              supabase.removeChannel(channel);
              resolve(true);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              window.clearTimeout(timer);
              supabase.removeChannel(channel);
              resolve(false);
            }
          });
      });
      results.push({
        id: "realtime",
        label: "Tempo real (painel)",
        status: realtimeOk ? "ok" : "warn",
        detail: realtimeOk
          ? "Pedidos actualizam na hora em todos os ecrãs."
          : "Modo reserva — actualização a cada poucos segundos.",
      });
    }

    // ACOMPANHAMENTO CLIENTE
    try {
      const { error } = await supabase.rpc("get_order_public", {
        _order_id: "00000000-0000-0000-0000-000000000000",
      });
      const ok =
        !error ||
        error.message.toLowerCase().includes("not found") ||
        error.code === "PGRST116";
      results.push({
        id: "tracking",
        label: "Acompanhamento do cliente",
        status: ok ? "ok" : "fail",
        detail: ok ? "Cliente consegue ver estado do pedido." : error?.message ?? "Indisponível",
        action: ok ? undefined : "Actualize a base de dados (migration de tracking).",
      });
    } catch {
      results.push({
        id: "tracking",
        label: "Acompanhamento do cliente",
        status: "warn",
        detail: "Não foi possível testar.",
      });
    }

    // IMPRESSÃO
    if (storeId) {
      const [cfg, pending, bridge] = await Promise.all([
        supabase.from("printer_settings").select("enabled").eq("store_id", storeId).maybeSingle(),
        supabase
          .from("print_jobs")
          .select("id", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("status", "pending"),
        checkBridgeStatus(storeId),
      ]);
      if (!cfg.data?.enabled) {
        results.push({
          id: "print",
          label: "Impressão",
          status: "warn",
          detail: "Impressora desactivada nas definições.",
          action: "Admin → Impressora → activar impressão.",
        });
      } else if (bridge === "inactive" && (pending.count ?? 0) > 0) {
        results.push({
          id: "print",
          label: "Impressão",
          status: "fail",
          critical: true,
          detail: `${pending.count} ticket(s) na fila — computador da cozinha offline.`,
          action: "Ligue o PC da cozinha com a app de impressão aberta.",
          link: `${nav.admin("diagnostics-hub")}?tab=printer`,
          linkLabel: "Centro de testes — Impressora",
        });
      } else if (bridge === "active") {
        results.push({
          id: "print",
          label: "Impressão",
          status: "ok",
          detail: "Impressora ligada e a funcionar.",
        });
      } else {
        results.push({
          id: "print",
          label: "Impressão",
          status: "warn",
          detail: "Impressora activa — aguardando ligação do PC da cozinha.",
        });
      }
    }

    // LOVABLE — Google Maps (informativo)
    results.push({
      id: "lovable-maps",
      label: "Aviso Google Maps (Lovable)",
      status: "warn",
      detail: "Se ao publicar aparecer aviso «Google Maps will not load», ignore ou remova a integração Maps na Lovable.",
      action: "Lovable → Definições → Integrações → Google Maps → Remover. O site não usa mapas.",
    });

    // PUSH — marketing e campanhas
    if (storeId) {
      const { count: marketingSubs } = await supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("customer_phone", CUSTOMER_MARKETING_PUSH_TAG);

      const subs = marketingSubs ?? 0;
      if (subs === 0) {
        results.push({
          id: "push-marketing",
          label: "Push marketing",
          status: "warn",
          detail: "Nenhum cliente subscrito a promoções push ainda.",
          action: "Clientes devem aceitar notificações no site. Teste em Centro de testes → Push.",
          link: `${nav.admin("diagnostics-hub")}?tab=push`,
          linkLabel: "Centro de testes — Push",
        });
      } else {
        results.push({
          id: "push-marketing",
          label: "Push marketing",
          status: "ok",
          detail: `${subs} subscritor(es) prontos para campanhas.`,
          link: `${nav.admin("diagnostics-hub")}?tab=campaigns`,
          linkLabel: "Enviar campanha",
        });
      }

      const { data: failedSends } = await (supabase as any)
        .from("campaign_send_log")
        .select("id, error_message, sent_at")
        .eq("store_id", storeId)
        .eq("status", "failed")
        .order("sent_at", { ascending: false })
        .limit(1);

      if (failedSends?.length) {
        results.push({
          id: "campaign-send-error",
          label: "Campanha push",
          status: "warn",
          detail: `Último envio falhou: ${(failedSends[0] as any).error_message ?? "erro desconhecido"}`,
          action: "Verifique VAPID e subscritores no Centro de testes.",
          link: `${nav.admin("diagnostics-hub")}?tab=campaigns`,
          linkLabel: "Centro de testes — Campanhas",
        });
      }
    } else {
      results.push({
        id: "push",
        label: "Notificações push",
        status: "warn",
        detail: "Opcional — escolha uma loja para ver subscritores.",
        link: `${nav.admin("diagnostics-hub")}?tab=push`,
        linkLabel: "Centro de testes",
      });
    }

    await wait(200);
    setItems(results);
    setLastRun(new Date());
    setRunning(false);
    return results;
  }, [storeId]);

  const criticalIssues = items.filter((i) => i.critical && (i.status === "fail" || i.status === "warn"));
  const failCount = items.filter((i) => i.status === "fail").length;
  const warnCount = items.filter((i) => i.status === "warn" && i.id !== "lovable-maps").length;

  return { items, running, lastRun, run, criticalIssues, failCount, warnCount };
}
