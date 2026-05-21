/**
 * Extrai uma lista de ingredientes a partir da descrição de um produto.
 * Funciona em es/pt/en/fr. Divide por vírgulas e conectores "y/e/and/et".
 * Mantém estruturas com "o/ou/or" (ex: "Pollo o ternera") como um único item.
 */
export function parseIngredients(description: string): string[] {
  if (!description) return [];
  // Normaliza conectores ' y ', ' e ', ' and ', ' et ' (case-insensitive) -> vírgula
  const normalized = description
    .replace(/\s+(?:y|e|and|et)\s+/gi, ", ")
    .replace(/\s*\.\s*$/, "");

  const parts = normalized
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    // Capitaliza primeira letra
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  // Remove duplicados (case-insensitive)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k) && p.length <= 40) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}
