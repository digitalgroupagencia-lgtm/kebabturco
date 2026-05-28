import { supabase } from "@/integrations/supabase/client";
import type { AppLang } from "@/lib/localizedText";
import { getCachedMenuTranslation, setCachedMenuTranslations } from "@/lib/menuTranslationCache";

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
