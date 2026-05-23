export const APP_BUILD_ID: string = __APP_BUILD_ID__;
export const APP_REFRESH_STORAGE_KEY = "snaporder:app-refresh";
export const APP_CACHE_BUST_EVENT = "snaporder:cache-bust";
const LEGACY_REFRESH_KEY = "kebabturco:app-refresh";

/** Invalida cache local e força remount dos providers/rotas (ex.: após mudança no admin). */
export function bumpAppCache() {
  const stamp = String(Date.now());
  try {
    localStorage.setItem(APP_REFRESH_STORAGE_KEY, stamp);
  } catch {
    // ignore (modo privado / quota)
  }
  window.dispatchEvent(new CustomEvent(APP_CACHE_BUST_EVENT, { detail: stamp }));
}

export function subscribeAppCacheBust(onBump: () => void) {
  const handler = () => onBump();
  const onStorage = (event: StorageEvent) => {
    if (event.key === APP_REFRESH_STORAGE_KEY) onBump();
  };

  window.addEventListener(APP_CACHE_BUST_EVENT, handler);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(APP_CACHE_BUST_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const path = window.location.pathname || "/";
    const response = await fetch(`${window.location.origin}${path}?_cb=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "text/html", "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta\s+name="app-build-id"\s+content="([^"]+)"/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Recarrega a app se o deploy no Lovable/publicado tiver versão mais recente que a em cache. */
export async function checkForDeployedUpdate() {
  if (import.meta.env.DEV) return;

  const remoteBuildId = await fetchRemoteBuildId();
  if (!remoteBuildId || remoteBuildId === APP_BUILD_ID) return;

  const reloadKey = "snaporder:last-reload-build";
  const lastReload = sessionStorage.getItem(reloadKey);
  if (lastReload === remoteBuildId) return;

  sessionStorage.setItem(reloadKey, remoteBuildId);

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }

  window.location.reload();
}

/** Query param para URLs de preview (iframe admin / Lovable). */
export function withCacheBust(url: string, token?: string | number) {
  const bust = token ?? Date.now();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_cb=${bust}`;
}
