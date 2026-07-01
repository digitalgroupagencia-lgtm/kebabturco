/** Rótulos de unidade de combo reconhecidos na impressão (pizza, pita, rollo…). */
const UNIT_WITH_INDEX =
  /(?:pizza|pan\s*pita|pita|rollo|hamburguesa|burger|durum|wrap|d[oö]ner|kebab|unidad|item)\s*(\d+)/i;
const UNIT_FROM_PHRASE =
  /(?:del|de la|sabor de la)\s*(\d+)\s*[º°ª\.]?\s*(?:pan|pita|pizza|rollo|hamburguesa|burger|unidad|item)?/i;

export function pickLocalizedLabel(name: Record<string, string> | null | undefined): string {
  if (!name) return "";
  return name.es || name.pt || name.en || name.fr || Object.values(name)[0] || "";
}

export function extractUnitNumberFromLabel(label: string): number | null {
  const l = label.toLowerCase();
  const m = l.match(UNIT_WITH_INDEX) || l.match(UNIT_FROM_PHRASE) || l.match(/\b(\d+)\s*[º°ª]\b/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function inferUnitTag(
  unitIndex: number | null | undefined,
  unitLabel: Record<string, string> | null | undefined,
  zeroBased: boolean,
): string {
  const lbl = pickLocalizedLabel(unitLabel).toLowerCase();
  const fromLabel = extractUnitNumberFromLabel(pickLocalizedLabel(unitLabel));
  const n =
    fromLabel ??
    (typeof unitIndex === "number" && unitIndex >= 0 ? (zeroBased ? unitIndex + 1 : unitIndex) : 1);

  if (/pizza/.test(lbl)) return `Pizza ${n}`;
  if (/rollo/.test(lbl)) return `Rollo ${n}`;
  if (/hamburg|burger/.test(lbl)) return `Hamburguesa ${n}`;
  if (/pita|pan\s*pita/.test(lbl)) return `Pita ${n}`;
  if (/kebab/.test(lbl) && !/pizza/.test(lbl)) return `Kebab ${n}`;
  return `Pita ${n}`;
}

export function detectUnitIndexFromExtraLabel(label: string): number | null {
  const prefix = label.split(":")[0]?.trim() ?? label;
  return extractUnitNumberFromLabel(prefix);
}

export function unitHeaderFromExtraLabel(label: string, fallbackIndex: number): string {
  const prefix = label.split(":")[0]?.trim();
  if (prefix && extractUnitNumberFromLabel(prefix)) return prefix.toUpperCase();
  return `UNIDAD ${fallbackIndex}`;
}
