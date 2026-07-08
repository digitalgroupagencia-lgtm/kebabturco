import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

const APP_HOSTS = new Set(["kebabturco.net", "www.kebabturco.net"]);
const PROCESSED_KEY = "__kebabturco_deeplink_processed__";
const PROCESSED_TS_KEY = "__kebabturco_deeplink_processed_at__";
// Janela curta: se o mesmo URL voltar dentro deste tempo (ex: reload da WKWebView),
// ignoramos para evitar loops de piscar entre tela branca/vinho.
const DEDUP_WINDOW_MS = 60_000;

function readProcessed(): { url: string | null; ts: number } {
  try {
    return {
      url: sessionStorage.getItem(PROCESSED_KEY),
      ts: Number(sessionStorage.getItem(PROCESSED_TS_KEY) || "0") || 0,
    };
  } catch {
    return { url: null, ts: 0 };
  }
}

function markProcessed(url: string) {
  try {
    sessionStorage.setItem(PROCESSED_KEY, url);
    sessionStorage.setItem(PROCESSED_TS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

async function safeRouteNativeUrl(rawUrl?: string | null) {
  if (!rawUrl) return;
  const { url: lastUrl, ts } = readProcessed();
  if (lastUrl === rawUrl && Date.now() - ts < DEDUP_WINDOW_MS) {
    console.info("[NativeDeepLink] ignorado (mesmo URL recente)", { rawUrl });
    return;
  }
  markProcessed(rawUrl);

  try {
    await routeNativeUrl(rawUrl);
  } catch (e) {
    console.warn("[NativeDeepLink] erro a processar", e);
  }
}

async function routeNativeUrl(rawUrl: string) {
  console.info("[NativeDeepLink] recebido", { rawUrl });

  const { handleStaffLiveActivityDeepLink } = await import(
    "@/services/acceptOrderFromLiveActivity"
  );

  if (rawUrl.startsWith("kebabturco://")) {
    await handleStaffLiveActivityDeepLink(rawUrl);
    return;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    console.warn("[NativeDeepLink] URL inválido", { rawUrl });
    return;
  }

  if (url.protocol === "kebabturco:") {
    await handleStaffLiveActivityDeepLink(rawUrl);
    return;
  }

  if (!APP_HOSTS.has(url.hostname)) {
    console.info("[NativeDeepLink] host fora do app", { host: url.hostname });
    return;
  }

  const path = `${url.pathname || "/"}${url.search}${url.hash}`;

  // action=accept: NUNCA aceitar automaticamente a partir do launch URL — apenas abrir
  // o painel do pedido. O botão explícito da Live Activity/push usa outro fluxo.
  if (url.searchParams.get("action") === "accept") {
    const orderId =
      url.searchParams.get("order") ||
      url.searchParams.get("order_id") ||
      url.pathname.match(/\/order\/([^/]+)/i)?.[1];
    if (orderId) {
      const target = `/panel/live?order=${encodeURIComponent(orderId)}`;
      if (currentPath() !== target) window.location.assign(target);
    }
    return;
  }

  if (currentPath() === path) return;
  console.info("[NativeDeepLink] navegar para", { path });
  window.location.assign(path);
}

/** Deep links nativos: apenas navegação, sem auto-aceitar. Dedup para evitar loops. */
export default function NativeDeepLinkEffect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    // Atraso pequeno garante que o router/auth começaram a hidratar antes de navegar.
    const launchTimer = setTimeout(() => {
      void CapacitorApp.getLaunchUrl()
        .then((launch) => safeRouteNativeUrl(launch?.url))
        .catch(() => undefined);
    }, 400);

    void CapacitorApp.addListener("appUrlOpen", (event) =>
      safeRouteNativeUrl(event.url),
    )
      .then((handle) => {
        remove = () => void handle.remove();
      })
      .catch(() => undefined);

    return () => {
      clearTimeout(launchTimer);
      remove?.();
    };
  }, []);

  return null;
}
