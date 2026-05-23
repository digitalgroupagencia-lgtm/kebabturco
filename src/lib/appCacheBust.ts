import { deployDebugLog } from "@/lib/deployDebugLog";

export const APP_BUILD_ID: string = __APP_BUILD_ID__;
export const GIT_SHA: string = __GIT_SHA__;
export const APP_REFRESH_STORAGE_KEY = "snaporder:app-refresh";
export const APP_CACHE_BUST_EVENT = "snaporder:cache-bust";

declare global {
  interface Window {
    __SNAPORDER_MAIN__?: string;
  }
}

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

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]+)"`, "i");
  return html.match(re)?.[1] ?? null;
}

function extractMainScript(html: string): string | null {
  const match = html.match(/<script type="module"[^>]*src="([^"]+)"/i);
  return match?.[1] ?? null;
}

function getLocalMainScript(): string | null {
  return window.__SNAPORDER_MAIN__ ?? null;
}

async function fetchRemoteDeployInfo(): Promise<{
  buildId: string | null;
  gitSha: string | null;
  mainScript: string | null;
}> {
  try {
    const path = window.location.pathname || "/";
    const response = await fetch(`${window.location.origin}${path}?_cb=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "text/html", "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (!response.ok) {
      return { buildId: null, gitSha: null, mainScript: null };
    }
    const html = await response.text();
    return {
      buildId: extractMeta(html, "app-build-id"),
      gitSha: extractMeta(html, "app-git-sha"),
      mainScript: extractMainScript(html),
    };
  } catch {
    return { buildId: null, gitSha: null, mainScript: null };
  }
}

async function purgeClientCaches() {
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
}

/** Recarrega a app se o deploy publicado tiver versão ou bundle diferente do local. */
export async function checkForDeployedUpdate() {
  if (import.meta.env.DEV) return;

  const localMain = getLocalMainScript();
  const remote = await fetchRemoteDeployInfo();
  const swCount =
    "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0;

  deployDebugLog({
    hypothesisId: "H1-H2-H5",
    location: "appCacheBust.ts:checkForDeployedUpdate",
    message: "deploy version compare",
    data: {
      localBuildId: APP_BUILD_ID,
      remoteBuildId: remote.buildId,
      localMain,
      remoteMain: remote.mainScript,
      localGitSha: GIT_SHA,
      remoteGitSha: remote.gitSha,
      swRegistrations: swCount,
      path: window.location.pathname,
    },
  });

  const buildMismatch = Boolean(remote.buildId && remote.buildId !== APP_BUILD_ID);
  const scriptMismatch = Boolean(
    remote.mainScript && localMain && remote.mainScript !== localMain,
  );

  if (!buildMismatch && !scriptMismatch) return;

  const reloadKey = "snaporder:last-reload-build";
  const reloadToken = `${remote.buildId ?? "x"}:${remote.mainScript ?? "x"}`;
  const lastReload = sessionStorage.getItem(reloadKey);
  if (lastReload === reloadToken) {
    deployDebugLog({
      hypothesisId: "H5",
      location: "appCacheBust.ts:checkForDeployedUpdate",
      message: "reload skipped — already reloaded this deploy",
      data: { reloadToken },
    });
    return;
  }

  sessionStorage.setItem(reloadKey, reloadToken);

  deployDebugLog({
    hypothesisId: "H1-H2",
    location: "appCacheBust.ts:checkForDeployedUpdate",
    message: "forcing reload — deploy mismatch",
    data: { buildMismatch, scriptMismatch, reloadToken },
  });

  await purgeClientCaches();
  window.location.reload();
}

/** Query param para URLs de preview (iframe admin / Lovable). */
export function withCacheBust(url: string, token?: string | number) {
  const bust = token ?? Date.now();
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_cb=${bust}`;
}

export type DeployVersionInfo = {
  buildId: string;
  gitSha: string;
  builtAt?: string;
};

/** Lê /version.json publicado (sem cache). */
export async function fetchPublishedVersion(): Promise<DeployVersionInfo | null> {
  try {
    const res = await fetch(`/version.json?_cb=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as DeployVersionInfo;
    return data;
  } catch {
    return null;
  }
}

/** true se o browser corre a mesma versão que /version.json no servidor. */
export async function isRunningLatestPublishedVersion(): Promise<{
  ok: boolean;
  local: DeployVersionInfo;
  remote: DeployVersionInfo | null;
}> {
  const local: DeployVersionInfo = { buildId: APP_BUILD_ID, gitSha: GIT_SHA };
  const remote = await fetchPublishedVersion();
  const ok = Boolean(remote && remote.buildId === APP_BUILD_ID && remote.gitSha === GIT_SHA);
  return { ok, local, remote };
}
