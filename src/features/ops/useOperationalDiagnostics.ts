import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { checkBridgeStatus } from "@/services/printerService";
import { APP_BUILD_ID, GIT_SHA, isRunningLatestPublishedVersion } from "@/lib/appCacheBust";

export type DiagnosticStatus = "ok" | "warn" | "fail" | "pending";

export type DiagnosticItem = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useOperationalDiagnostics() {
  const { storeId } = useAdminStoreId();
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    const results: DiagnosticItem[] = [];

    // VERSÃO — browser vs servidor publicado
    try {
      const version = await isRunningLatestPublishedVersion();
      if (!version.remote) {
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "warn",
          detail: `Browser: ${GIT_SHA} (${APP_BUILD_ID}). Servidor ainda sem /version.json — Publish pendente ou cache CDN.`,
        });
      } else if (version.ok) {
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "ok",
          detail: `Actualizado — commit ${GIT_SHA}, build ${APP_BUILD_ID}.`,
        });
      } else {
        results.push({
          id: "deploy",
          label: "Versão publicada",
          status: "fail",
          detail: `DESACTUALIZADO — browser ${GIT_SHA} vs servidor ${version.remote.gitSha}. Recarrega ou limpa cache Safari.`,
        });
      }
    } catch {
      results.push({
        id: "deploy",
        label: "Versão publicada",
        status: "warn",
        detail: "Não foi possível comparar com /version.json.",
      });
    }

    // PRODUÇÃO — loja e menu público
    try {
      const { data, error } = await supabase.from("stores_public").select("id, name").limit(1);
      if (error) {
        results.push({
          id: "production",
          label: "Produção",
          status: "fail",
          detail: `Loja/menu inacessível: ${error.message}`,
        });
      } else if (!data?.length) {
        results.push({
          id: "production",
          label: "Produção",
          status: "warn",
          detail: "Ligação OK mas nenhuma loja pública encontrada.",
        });
      } else {
        results.push({
          id: "production",
          label: "Produção",
          status: "ok",
          detail: `Loja activa: ${data[0].name || data[0].id}`,
        });
      }
    } catch (e) {
      results.push({
        id: "production",
        label: "Produção",
        status: "fail",
        detail: e instanceof Error ? e.message : "Erro de rede",
      });
    }

    // MOBILE — ambiente do browser
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    results.push({
      id: "mobile",
      label: "Mobile",
      status: touch ? "ok" : "warn",
      detail: touch
        ? standalone
          ? "Telemóvel em modo app (ecrã completo)."
          : "Telemóvel/browser táctil — abrir no Safari e «Adicionar ao ecrã» para app."
        : "Ambiente desktop — testar também no iPhone.",
    });

    // REALTIME — subscrição pedidos
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
          ? "Ligação em tempo real activa — pedidos actualizam na hora."
          : "Modo reserva activo — polling de backup (8–30s).",
      });
    } else {
      results.push({
        id: "realtime",
        label: "Tempo real (painel)",
        status: "warn",
        detail: "Sem loja vinculada ao utilizador.",
      });
    }

    // TRACKING — função pública
    try {
      const { error } = await supabase.rpc("get_order_public", {
        _order_id: "00000000-0000-0000-0000-000000000000",
      });
      if (error && !error.message.toLowerCase().includes("not found") && error.code !== "PGRST116") {
        results.push({
          id: "tracking",
          label: "Acompanhamento cliente",
          status: "fail",
          detail: error.message,
        });
      } else {
        results.push({
          id: "tracking",
          label: "Acompanhamento cliente",
          status: "ok",
          detail: "Consulta pública de pedidos disponível (fase 8 SQL activa).",
        });
      }
    } catch (e) {
      results.push({
        id: "tracking",
        label: "Acompanhamento cliente",
        status: "fail",
        detail: e instanceof Error ? e.message : "Erro",
      });
    }

    // PRINT
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
        });
      } else if (bridge === "inactive" && (pending.count ?? 0) > 0) {
        results.push({
          id: "print",
          label: "Impressão",
          status: "fail",
          detail: `${pending.count} ticket(s) na fila — PC da cozinha offline.`,
        });
      } else if (bridge === "active") {
        results.push({
          id: "print",
          label: "Impressão",
          status: "ok",
          detail: "Bridge activo — tickets a imprimir.",
        });
      } else {
        results.push({
          id: "print",
          label: "Impressão",
          status: "warn",
          detail: "Impressora activa — aguardando primeiro job ou bridge.",
        });
      }
    } else {
      results.push({
        id: "print",
        label: "Impressão",
        status: "warn",
        detail: "Sem loja para testar impressão.",
      });
    }

    // PUSH — opcional
    const hasSw = "serviceWorker" in navigator;
    let pushDetail = "Notificações push adiadas (fase C) — não afecta operação diária.";
    let pushStatus: DiagnosticStatus = "warn";
    if (hasSw) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          pushStatus = "ok";
          pushDetail = "Service worker registado — push pode ser activado depois.";
        }
      } catch {
        /* ignore */
      }
    }
    results.push({ id: "push", label: "Push (opcional)", status: pushStatus, detail: pushDetail });

    await wait(300);
    setItems(results);
    setLastRun(new Date());
    setRunning(false);
  }, [storeId]);

  return { items, running, lastRun, run };
}
