/**
 * Sessão Supabase persistente no iPhone/Android: Preferences + localStorage espelhado.
 * Evita logout ao fechar a app quando o WebView limpa localStorage no cold-start.
 */
import { isCapacitorNativeSync } from "@/lib/capacitorRuntime";

const STORAGE_KEY = "kebabturco-auth";

type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

let preferencesApi: {
  get: (opts: { key: string }) => Promise<{ value: string | null }>;
  set: (opts: { key: string; value: string }) => Promise<void>;
  remove: (opts: { key: string }) => Promise<void>;
} | null = null;

let preferencesLoad: Promise<void> | null = null;

function loadPreferences(): Promise<void> {
  if (preferencesLoad) return preferencesLoad;
  preferencesLoad = (async () => {
    if (!isCapacitorNativeSync()) return;
    try {
      const mod = await import("@capacitor/preferences");
      preferencesApi = mod.Preferences;
    } catch {
      preferencesApi = null;
    }
  })();
  return preferencesLoad;
}

async function hydrateLocalFromPreferences(key: string): Promise<string | null> {
  await loadPreferences();
  if (!preferencesApi) return null;
  try {
    const { value } = await preferencesApi.get({ key });
    if (value && typeof localStorage !== "undefined") {
      const existing = localStorage.getItem(key);
      if (!existing) localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return null;
  }
}

async function mirrorToPreferences(key: string, value: string | null): Promise<void> {
  await loadPreferences();
  if (!preferencesApi) return;
  try {
    if (value === null) await preferencesApi.remove({ key });
    else await preferencesApi.set({ key, value });
  } catch {
    /* ignore */
  }
}

export const capacitorAuthStorage: StorageAdapter = {
  getItem(key: string) {
    if (typeof localStorage === "undefined") return null;
    const local = localStorage.getItem(key);
    if (local) {
      void mirrorToPreferences(key, local);
      return local;
    }
    if (!isCapacitorNativeSync()) return null;
    return hydrateLocalFromPreferences(key);
  },
  setItem(key: string, value: string) {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    void mirrorToPreferences(key, value);
  },
  removeItem(key: string) {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    void mirrorToPreferences(key, null);
  },
};

export const AUTH_STORAGE_KEY = STORAGE_KEY;

/** Hidrata sessão antes do primeiro getSession() no arranque frio. */
export async function hydrateAuthStorageBeforeBoot(): Promise<void> {
  if (!isCapacitorNativeSync() || typeof localStorage === "undefined") return;
  await loadPreferences();
  const fromPrefs = await hydrateLocalFromPreferences(STORAGE_KEY);
  if (fromPrefs && !localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, fromPrefs);
  }
}
