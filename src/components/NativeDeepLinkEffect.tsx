import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

const APP_HOSTS = new Set(["kebabturco.net", "www.kebabturco.net"]);

function openDeepLink(rawUrl?: string | null) {
  if (!rawUrl) return;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }
  if (!APP_HOSTS.has(url.hostname)) return;

  const path = `${url.pathname || "/"}${url.search}${url.hash}`;
  if (window.location.pathname + window.location.search + window.location.hash === path) return;

  // Reload interno: o Supabase detecta códigos/tokens OAuth e confirmações de e-mail na abertura.
  window.location.assign(path);
}

export default function NativeDeepLinkEffect() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    void CapacitorApp.getLaunchUrl().then((launch) => openDeepLink(launch?.url)).catch(() => undefined);
    void CapacitorApp.addListener("appUrlOpen", (event) => openDeepLink(event.url)).then((handle) => {
      remove = () => void handle.remove();
    }).catch(() => undefined);

    return () => remove?.();
  }, []);

  return null;
}