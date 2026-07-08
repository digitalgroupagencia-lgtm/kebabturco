import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

const APP_HOSTS = new Set(["kebabturco.net", "www.kebabturco.net"]);

async function routeNativeUrl(rawUrl?: string | null) {
  if (!rawUrl) return;

  const { handleStaffLiveActivityDeepLink } = await import("@/services/acceptOrderFromLiveActivity");

  if (rawUrl.startsWith("kebabturco://")) {
    await handleStaffLiveActivityDeepLink(rawUrl);
    return;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }

  if (url.protocol === "kebabturco:") {
    await handleStaffLiveActivityDeepLink(rawUrl);
    return;
  }

  if (!APP_HOSTS.has(url.hostname)) return;
  const path = `${url.pathname || "/"}${url.search}${url.hash}`;
  if (url.searchParams.get("action") === "accept") {
    await handleStaffLiveActivityDeepLink(url.toString());
    return;
  }
  if (window.location.pathname + window.location.search + window.location.hash === path) return;
  window.location.assign(path);
}

/** Deep links nativos: aceitar pedido + navegação painel. */
export default function NativeDeepLinkEffect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    void CapacitorApp.getLaunchUrl()
      .then((launch) => routeNativeUrl(launch?.url))
      .catch(() => undefined);
    void CapacitorApp.addListener("appUrlOpen", (event) => routeNativeUrl(event.url))
      .then((handle) => {
        remove = () => void handle.remove();
      })
      .catch(() => undefined);

    return () => remove?.();
  }, []);

  return null;
}
