/**
 * Mapa de emojis para ingredientes, extras e variantes.
 * Match por substring (case-insensitive), funciona com nomes em es/en/pt/fr.
 * "Mixto" retorna dois emojis combinados (frango + carne).
 */

const RAW: Record<string, string> = {
  // Variante MIXTA, dois emojis combinados (frango + carne)
  mixto: "🍗🥩", mixed: "🍗🥩", misto: "🍗🥩", mixte: "🍗🥩",

  // Proteínas
  pollo: "🍗", chicken: "🍗", frango: "🍗", poulet: "🍗",
  ternera: "🥩", beef: "🥩", carne: "🥩", boeuf: "🥩", bœuf: "🥩",
  vegetal: "🥗", vegetable: "🥗", vegan: "🌱",
  falafel: "🧆",
  cordero: "🐑", lamb: "🐑",
  pescado: "🐟", fish: "🐟", peixe: "🐟",
  gamba: "🦐", langostino: "🦐", shrimp: "🦐", camarao: "🦐",

  // Vegetais, cada um com emoji ÚNICO
  lechuga: "🥬", lettuce: "🥬", alface: "🥬", laitue: "🥬",
  col: "🥗", cabbage: "🥗", repolho: "🥗", chou: "🥗", couve: "🥗",
  tomate: "🍅", tomato: "🍅",
  cebolla: "🧅", onion: "🧅", cebola: "🧅", oignon: "🧅",
  pepino: "🥒", cucumber: "🥒", concombre: "🥒",
  zanahoria: "🥕", carrot: "🥕", cenoura: "🥕", carotte: "🥕",
  maiz: "🌽", "maíz": "🌽", corn: "🌽", milho: "🌽", "maïs": "🌽",
  aceitunas: "🫒", olive: "🫒", azeitona: "🫒",
  champinones: "🍄", "champiñones": "🍄", mushroom: "🍄", cogumelo: "🍄", champignon: "🍄",
  pimiento: "🫑", pepper: "🫑", pimento: "🫑", poivron: "🫑",
  jalapeno: "🌶️", "jalapeño": "🌶️", picante: "🌶️", spicy: "🌶️",

  // Queijos / lácteos, TODOS com 🧀
  mozzarella: "🧀", muzzarella: "🧀", mozarela: "🧀", "muçarela": "🧀", mucarela: "🧀",
  feta: "🧀",
  parmesano: "🧀", parmesan: "🧀",
  cheddar: "🧀",
  camembert: "🧀",
  gouda: "🧀",
  queso: "🧀", cheese: "🧀", queijo: "🧀", fromage: "🧀",
  cabra: "🐐", goat: "🐐", "chèvre": "🐐",

  // Carnes processadas
  bacon: "🥓",
  jamon: "🥓", "jamón": "🥓", ham: "🥓", presunto: "🥓", jambon: "🥓",
  pepperoni: "🍕",
  atun: "🐟", "atún": "🐟", tuna: "🐟", atum: "🐟", thon: "🐟",
  huevo: "🥚", egg: "🥚", ovo: "🥚", "œuf": "🥚",

  // Acompanhamentos
  patatas: "🍟", patata: "🍟", fries: "🍟", batata: "🍟", batatas: "🍟", frites: "🍟",
  pan: "🥖", bread: "🥖", pao: "🥖", "pão": "🥖", pain: "🥖",
  pita: "🫓",
  arroz: "🍚", rice: "🍚",

  // Molhos / temperos
  salsas: "🥫", salsa: "🥫", sauces: "🥫", sauce: "🥫", molho: "🥫", molhos: "🥫",
  oregano: "🌿", "orégano": "🌿",
  ajo: "🧄", garlic: "🧄", alho: "🧄", ail: "🧄",
  miel: "🍯", honey: "🍯", mel: "🍯",
  crujiente: "🧅",

  // Bebidas
  cocacola: "🥤", coca: "🥤", cola: "🥤",
  agua: "💧", water: "💧", eau: "💧",
  cerveza: "🍺", beer: "🍺", cerveja: "🍺", "bière": "🍺",
  vino: "🍷", wine: "🍷", vinho: "🍷", vin: "🍷",
  cafe: "☕", "café": "☕", coffee: "☕",

  // Doces
  chocolate: "🍫",
  fresa: "🍓", strawberry: "🍓", morango: "🍓", fraise: "🍓",
  vainilla: "🍦", vanilla: "🍦", baunilha: "🍦", vanille: "🍦",
};

// Ordenar por chave mais longa primeiro para que "mozzarella" tenha prioridade sobre "queso"
// e "lechuga" não seja capturado por "col" etc.
const NORMALIZED = Object.entries(RAW)
  .map(([k, v]) => [k.toLowerCase(), v] as const)
  .sort((a, b) => b[0].length - a[0].length);

export function emojiFor(name: string, fallback: string = "🥄"): string {
  if (!name) return fallback;
  const n = name.toLowerCase().trim();
  // exact match primeiro
  for (const [k, v] of NORMALIZED) if (n === k) return v;
  // substring match (chaves mais longas têm prioridade)
  for (const [k, v] of NORMALIZED) if (n.includes(k)) return v;
  return fallback;
}

const NEGATION_PATTERNS = /^(sin|sem|no|without|sans)\s+/i;

/**
 * Igual a `emojiFor`, mas quando o nome começa com "sin/sem/no/without/sans"
 * devolve o emoji-base acompanhado de 🚫 para reforçar visualmente a remoção.
 * Também mapeia palavras extra usadas em opções (torrinha, hielo, gelo, etc).
 */
export function emojiForOption(name: string, fallback: string = "🥄"): string {
  if (!name) return fallback;
  const raw = name.trim();
  const negated = NEGATION_PATTERNS.test(raw);
  const cleaned = raw
    .replace(NEGATION_PATTERNS, "")
    .replace(/^(añadir|adicionar|add|ajouter|extra|con|com|with|avec)\s+/i, "")
    .trim();

  const extraMap: Record<string, string> = {
    torrinha: "🍞", torrada: "🍞", toast: "🍞", tostada: "🍞",
    hielo: "🧊", ice: "🧊", gelo: "🧊", glace: "🧊", glaçon: "🧊",
    tarrina: "🥫",
  };
  const lc = cleaned.toLowerCase();
  let base = fallback;
  for (const [k, v] of Object.entries(extraMap)) {
    if (lc.includes(k)) { base = v; break; }
  }
  if (base === fallback) base = emojiFor(cleaned || raw, fallback);
  return negated ? `${base}🚫` : base;
}
