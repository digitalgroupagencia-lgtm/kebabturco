/**
 * Divide o nome de um produto em duas linhas equilibradas.
 * Prioriza quebrar no separador (-, –, |, /, ·) ou na palavra do meio.
 * Funciona em qualquer idioma.
 */
import { parseProductCode } from "./parseProductCode";

export function splitProductName(name: string): [string, string] {
  if (!name) return ["", ""];
  // Remove o código (ex: "54. ") antes de dividir
  const trimmed = parseProductCode(name).name;


  // 1) Tenta quebrar em separador comum
  const sepMatch = trimmed.match(/^(.+?)\s*[-–, |/·]\s*(.+)$/);
  if (sepMatch) {
    return [sepMatch[1].trim(), sepMatch[2].trim()];
  }

  // 2) Quebra pelo meio das palavras
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return [trimmed, ""];
  if (words.length === 2) return [words[0], words[1]];

  // Encontrar índice que melhor equilibra o tamanho das duas linhas
  let bestIdx = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const diff = Math.abs(left.length - right.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(" "), words.slice(bestIdx).join(" ")];
}