/**
 * Extrai o código numérico do início do nome do produto.
 * Ex: "54. Pizza Hawaiana" -> { code: "54", name: "Pizza Hawaiana" }
 * Ex: "29B. Durum al Horno" -> { code: "29B", name: "Durum al Horno" }
 * Ex: "Combo 4 Rollos" -> { code: null, name: "Combo 4 Rollos" }
 */
export function parseProductCode(fullName: string): { code: string | null; name: string } {
  if (!fullName) return { code: null, name: "" };
  const match = fullName.trim().match(/^(\d{1,3}[A-Za-z]?)\s*[.\-–, :)]\s*(.+)$/);
  if (match) {
    return { code: match[1], name: match[2].trim() };
  }
  return { code: null, name: fullName.trim() };
}
