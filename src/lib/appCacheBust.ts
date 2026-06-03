import { isPushHandlerRegistration } from "@/lib/push/pushServiceWorker";
import { deployDebugLog } from "@/lib/deployDebugLog";

export const APP_BUILD_ID: string = __APP_BUILD_ID__;
export const GIT_SHA: string = __GIT_SHA__;
export const APP_REFRESH_STORAGE_KEY = "snaporder:app-refresh";
export const APP_CACHE_BUST_EVENT = "snaporder:cache-bust";

declare global {
  interface Window {
    __SNAPORDER_MAIN__?: string;
    __SNAPORDER_APP_READY__?: boolean;
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
  const moduleMatch = html.match(/<script type="module"[^>]*src="([^"]+)"/i);
  if (moduleMatch) return moduleMatch[1];
  // Boot diferido (produção): <script src="/snaporder-boot.js" data-app-src="/assets/index-….js">
  const dataSrcMatch = html.match(/data-app-src="([^"]*\/assets\/index-[^"]+\.js)"/i);
  if (dataSrcMatch) return dataSrcMatch[1];
  const legacyDeferMatch = html.match(/var src=(["'])(\/assets\/index-[^"']+\.js)\1/);
  if (legacyDeferMatch) return legacyDeferMatch[2];
  return null;
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
      await Promise.all(regs.map((r) => (isPushHandlerRegistration(r) ? Promise.resolve() : r.unregister())));
    }
  } catch {
    /* ignore */
  }
}

/** Recarrega a app se o deploy publicado tiver versão ou bundle diferente do local. */
export async function checkForDeployedUpdate() {
  if (import.meta.env.DEV) return;
  // Evita reload agressivo ao abrir pelo ícone do telemóvel (Safari).
  if (typeof performance !== "undefined" && performance.now() < 8000) return;

  const localMain = getLocalMainScript();
  const remote = await fetchRemoteDeployInfo();
  const versionJson = await fetchPublishedVersion();
  const swCount =
    "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0;

  deployDebugLog({
    hypothesisId: "H1-H2-H5",
    location: "appCacheBust.ts:checkForDeployedUpdate",
    message: "deploy version compare",
    data: {
      localBuildId: APP_BUILD_ID,
      remoteBuildId: remote.buildId,
      remoteVersionJsonBuildId: versionJson?.buildId ?? null,
      localMain,
      remoteMain: remote.mainScript,
      localGitSha: GIT_SHA,
      remoteGitSha: remote.gitSha,
      swRegistrations: swCount,
      path: window.location.pathname,
    },
    runId: "post-fix",
  });

  const remoteBuildId = versionJson?.buildId ?? remote.buildId;
  const buildMismatch = Boolean(remoteBuildId && remoteBuildId !== APP_BUILD_ID);
  const scriptMismatch = Boolean(
    remote.mainScript && localMain && remote.mainScript !== localMain,
  );

  if (!buildMismatch && !scriptMismatch) return;

  const reloadKey = "snaporder:last-reload-build";
  const reloadToken = `${remoteBuildId ?? "x"}:${remote.mainScript ?? "x"}`;
  const lastReload = sessionStorage.getItem(reloadKey);
  if (lastReload === reloadToken) {
    deployDebugLog({
      hypothesisId: "H5",
      location: "appCacheBust.ts:checkForDeployedUpdate",
      message: "reload skipped — already reloaded this deploy",
      data: { reloadToken },
      runId: "post-fix",
    });
    return;
  }

  sessionStorage.setItem(reloadKey, reloadToken);

  deployDebugLog({
    hypothesisId: "H1-H2",
    location: "appCacheBust.ts:checkForDeployedUpdate",
    message: "forcing reload — deploy mismatch",
    data: { buildMismatch, scriptMismatch, reloadToken },
    runId: "post-fix",
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

function gitShaMatches(local: string, remote: string): boolean {
  if (!local || !remote || local === "unknown" || remote === "unknown") return true;
  return local === remote;
}

/** true se o browser corre a mesma versão que /version.json no servidor. */
export async function isRunningLatestPublishedVersion(): Promise<{
  ok: boolean;
  local: DeployVersionInfo;
  remote: DeployVersionInfo | null;
}> {
  const local: DeployVersionInfo = { buildId: APP_BUILD_ID, gitSha: GIT_SHA };
  const remote = await fetchPublishedVersion();
  const ok = Boolean(
    remote && remote.buildId === APP_BUILD_ID && gitShaMatches(GIT_SHA, remote.gitSha),
  );
  return { ok, local, remote };
}
