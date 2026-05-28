import type { AppLang } from "./localizedText";

const STORAGE_KEY = "menu-translation-cache-v1";
const MAX_ENTRIES = 4000;

type CacheStore = Record<string, string>;

function cacheKey(text: string, from: AppLang, to: AppLang): string {
  return `${from}>${to}:${text}`;
}

function readStore(): CacheStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore) {
  try {
    const entries = Object.entries(store);
    const trimmed =
      entries.length > MAX_ENTRIES ? Object.fromEntries(entries.slice(-MAX_ENTRIES)) : store;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / private mode */
  }
}

export function getCachedMenuTranslation(
  text: string,
  from: AppLang,
  to: AppLang,
): string | null {
  if (!text.trim() || from === to) return text;
  const store = readStore();
  return store[cacheKey(text, from, to)] ?? null;
}

export function setCachedMenuTranslations(
  from: AppLang,
  to: AppLang,
  pairs: Record<string, string>,
) {
  const store = readStore();
  for (const [source, translated] of Object.entries(pairs)) {
    if (!source.trim() || !translated.trim()) continue;
    store[cacheKey(source, from, to)] = translated.trim();
  }
  writeStore(store);
}
