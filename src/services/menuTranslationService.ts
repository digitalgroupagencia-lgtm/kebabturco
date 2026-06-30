import { supabase } from "@/integrations/supabase/client";
import type { AppLang } from "@/lib/localizedText";
import { getCachedMenuTranslation, setCachedMenuTranslations } from "@/lib/menuTranslationCache";
import { seedMenuGlossaryCache, translateMenuGlossary } from "@/lib/menuFoodGlossary";

export async function translateMenuTexts(
  texts: string[],
  from: AppLang,
  to: AppLang,
): Promise<Record<string, string>> {
  if (from === to) {
    return Object.fromEntries(texts.map((t) => [t, t]));
  }

  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const text of unique) {
    const cached = getCachedMenuTranslation(text, from, to);
    if (cached) result[text] = cached;
    else missing.push(text);
  }

  if (!missing.length) return result;

  const { data, error } = await supabase.functions.invoke("translate-menu-text", {
    body: { texts: missing, from, to },
  });

  if (error) {
    console.warn("[translateMenuTexts]", error.message);
    for (const text of missing) result[text] = text;
    return result;
  }

  const translations = (data as { translations?: Record<string, string> })?.translations ?? {};
  setCachedMenuTranslations(from, to, translations);

  for (const text of missing) {
    result[text] = translations[text]?.trim() || text;
  }

  return result;
}

const BATCH_SIZE = 40;
const BATCH_CONCURRENCY = 3;

/** Traduz todos os textos em lotes paralelos (API aceita até 40 por pedido). */
export async function translateMenuTextsBatched(
  texts: string[],
  from: AppLang,
  to: AppLang,
): Promise<Record<string, string>> {
  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
  const merged: Record<string, string> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    chunks.push(unique.slice(i, i + BATCH_SIZE));
  }
  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    const wave = chunks.slice(i, i + BATCH_CONCURRENCY);
    const parts = await Promise.all(wave.map((chunk) => translateMenuTexts(chunk, from, to)));
    for (const part of parts) Object.assign(merged, part);
  }
  return merged;
}

export async function ensureMenuTranslationSources(
  sources: string[],
  from: AppLang,
  to: AppLang,
): Promise<void> {
  if (from === to || !sources.length) return;
  seedMenuGlossaryCache(sources, from, to);
  const stillMissing = sources.filter((text) => {
    const glossary = translateMenuGlossary(text, from, to);
    if (glossary && glossary !== text) return false;
    return !getCachedMenuTranslation(text, from, to);
  });
  if (!stillMissing.length) return;
  await translateMenuTextsBatched(stillMissing, from, to);
}
