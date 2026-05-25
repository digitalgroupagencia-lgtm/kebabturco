import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { checkBridgeStatus } from "@/services/printerService";
import {
  fetchDbOperationalDiagnostics,
  fetchServerOperationalDiagnostics,
  probeSchemaFallback,
} from "@/services/operationalDiagnosticsService";
import { fetchStoreFinancialProfile } from "@/services/orderService";
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
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const STRIPE_PUBLISHABLE = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function useOperationalDiagnostics() {
  const { storeId } = useAdminStoreId();
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    const results: DiagnosticItem[] = [];

    const [dbDiag, serverDiag, schemaProbe, storeProfile] = await Promise.all([
      fetchDbOperationalDiagnostics(storeId),
      fetchServerOperationalDiagnostics(storeId),
      probeSchemaFallback(),
      storeId ? fetchStoreFinancialProfile(storeId) : Promise.resolve(null),
    ]);

    const schemaQr = dbDiag?.schema_qr_token ?? schemaProbe.schema_qr_token;
    const schemaPrint = dbDiag?.schema_kitchen_print ?? schemaProbe.schema_kitchen_print;
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
        action:
          "Na Lovable, escreva no chat exactamente: «Apply all pending Supabase migrations». Depois Sync + Publish e clique Verificar aqui.",
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
          "Na Lovable, escreva no chat: «Apply all pending Supabase migrations». Se persistir, contacte o suporte Lovable Cloud.",
      });
    } else {
      results.push({
        id: "database",
        label: "Base de dados",
        status: "ok",
        detail: "Actualizações de mesa, pagamento e impressão estão aplicadas.",
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

    // STRIPE — chave pública no site (Lovable)
    if (!STRIPE_PUBLISHABLE) {
      results.push({
        id: "stripe-site-key",
        label: "Pagamentos online (site)",
        status: "fail",
        critical: true,
        detail: "O site publicado não tem a chave pública da Stripe — o cliente não vê cartão.",
        action:
          "Na Lovable: Definições do projecto → Variáveis → adicione VITE_STRIPE_PUBLISHABLE_KEY com a chave publicável da Stripe. Depois Sync + Publish.",
      });
    } else {
      results.push({
        id: "stripe-site-key",
        label: "Pagamentos online (site)",
        status: "ok",
        detail: "Chave pública da Stripe presente no site.",
      });
    }

    // STRIPE — chave secreta (servidor)
    if (serverDiag == null) {
      results.push({
        id: "stripe-server",
        label: "Pagamentos online (servidor)",
        status: "warn",
        critical: true,
        detail: "Não foi possível verificar o servidor — a função de diagnóstico pode não estar activa.",
        action:
          "Na Lovable: «Deploy all edge functions» (ou «Deploy stripe-create-payment-intent»). Depois Sync + Publish.",
      });
    } else if (!serverDiag.stripeSecretKey) {
      results.push({
        id: "stripe-server",
        label: "Pagamentos online (servidor)",
        status: "fail",
        critical: true,
        detail: "Chave secreta da Stripe em falta no servidor.",
        action: "No Supabase → Edge Functions → Secrets → adicione STRIPE_SECRET_KEY.",
      });
    } else {
      results.push({
        id: "stripe-server",
        label: "Pagamentos online (servidor)",
        status: "ok",
        detail: "Chave secreta da Stripe configurada no servidor.",
      });
    }

    // STRIPE Connect — conta restaurante
    const chargesOk = storeProfile?.stripe_charges_enabled ?? serverDiag?.store?.stripe_charges_enabled;
    const onboardingOk =
      storeProfile?.stripe_onboarding_completed ?? serverDiag?.store?.stripe_onboarding_completed;
    const hasConnect =
      Boolean(storeProfile?.stripe_connect_account_id ?? serverDiag?.store?.stripe_connect_account_id);

    if (!hasConnect || !chargesOk || !onboardingOk) {
      results.push({
        id: "stripe-connect",
        label: "Conta bancária (Stripe)",
        status: "fail",
        critical: true,
        detail: !hasConnect
          ? "Recebimentos online ainda não foram activados."
          : "Dados bancários incompletos — pagamentos online bloqueados.",
        action: "Admin → Recebimentos → Completar dados bancários e seguir o processo da Stripe.",
      });
    } else {
      results.push({
        id: "stripe-connect",
        label: "Conta bancária (Stripe)",
        status: "ok",
        detail: "Conta Stripe activa — pode receber pagamentos online.",
      });
    }

    // WEBHOOK
    if (serverDiag) {
      if (!serverDiag.stripeWebhookSecret) {
        results.push({
          id: "stripe-webhook-secret",
          label: "Webhook Stripe (servidor)",
          status: "fail",
          critical: true,
          detail: "Segredo do webhook em falta — pagamentos podem não confirmar automaticamente.",
          action: "No Supabase → Secrets → adicione STRIPE_WEBHOOK_SECRET (valor da Stripe).",
        });
      } else {
        results.push({
          id: "stripe-webhook-secret",
          label: "Webhook Stripe (servidor)",
          status: "ok",
          detail: "Segredo do webhook configurado.",
        });
      }

      if (!serverDiag.webhookConfigured) {
        results.push({
          id: "stripe-webhook-active",
          label: "Webhook Stripe (ligação)",
          status: "fail",
          critical: true,
          detail: "A Stripe não tem webhook activo apontando para este projecto.",
          action: `Na Stripe → Developers → Webhooks → Add endpoint → URL: ${serverDiag.webhookExpectedUrl} → eventos payment_intent.succeeded e account.updated.`,
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
            "Na Lovable, escreva no chat: «Apply all pending Supabase migrations» e depois «Deploy all edge functions». Depois Sync + Publish.",
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
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "warn",
          detail: "O site no browser pode não ser a última versão — Publish pendente ou cache.",
          action: "Na Lovable: Sync + Publish. Depois recarregue o site (no iPhone: fechar e abrir).",
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
        status: "warn",
        detail: "Não foi possível comparar versões.",
        action: "Faça Sync + Publish na Lovable e recarregue.",
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

    // PUSH — opcional
    results.push({
      id: "push",
      label: "Notificações push",
      status: "warn",
      detail: "Opcional — não afecta pedidos nem pagamentos.",
    });

    await wait(200);
    setItems(results);
    setLastRun(new Date());
    setRunning(false);
  }, [storeId]);

  const criticalIssues = items.filter((i) => i.critical && (i.status === "fail" || i.status === "warn"));
  const failCount = items.filter((i) => i.status === "fail").length;
  const warnCount = items.filter((i) => i.status === "warn" && i.id !== "push" && i.id !== "lovable-maps").length;

  return { items, running, lastRun, run, criticalIssues, failCount, warnCount };
}
