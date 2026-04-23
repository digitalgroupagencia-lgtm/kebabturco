/**
 * Mapa de emojis para ingredientes, extras e variantes.
 * Usado nos cards visuais da tela de produto.
 * Match por substring (case-insensitive) — funciona com nomes em es/en/pt/fr.
 */

const RAW: Record<string, string> = {
  // Proteínas / variantes
  pollo: "🍗", chicken: "🍗", frango: "🍗", poulet: "🍗",
  ternera: "🥩", beef: "🥩", carne: "🥩", boeuf: "🥩",
  mixto: "🍢", mixed: "🍢", misto: "🍢", mixte: "🍢",
  vegetal: "🥗", vegetable: "🥗", vegan: "🌱",
  falafel: "🧆",
  cordero: "🐑", lamb: "🐑",
  pescado: "🐟", fish: "🐟", peixe: "🐟",
  gamba: "🦐", langostino: "🦐", shrimp: "🦐", camarao: "🦐",

  // Vegetais
  lechuga: "🥬", lettuce: "🥬", alface: "🥬", laitue: "🥬",
  tomate: "🍅", tomato: "🍅",
  cebolla: "🧅", onion: "🧅", cebola: "🧅", oignon: "🧅",
  pepino: "🥒", cucumber: "🥒", concombre: "🥒",
  zanahoria: "🥕", carrot: "🥕", cenoura: "🥕", carotte: "🥕",
  maiz: "🌽", maíz: "🌽", corn: "🌽", milho: "🌽", maïs: "🌽",
  col: "🥬", cabbage: "🥬", repolho: "🥬", chou: "🥬",
  aceitunas: "🫒", olive: "🫒", azeitona: "🫒",
  champinones: "🍄", champiñones: "🍄", mushroom: "🍄", cogumelo: "🍄", champignon: "🍄",
  pimiento: "🫑", pepper: "🫑", pimento: "🫑", poivron: "🫑",
  jalapeno: "🌶️", jalapeño: "🌶️", picante: "🌶️", spicy: "🌶️",

  // Queijos / lácteos
  queso: "🧀", cheese: "🧀", queijo: "🧀", fromage: "🧀",
  cabra: "🐐", goat: "🐐", chèvre: "🐐",
  camembert: "🧀",
  gouda: "🧀",

  // Carnes processadas
  bacon: "🥓",
  jamon: "🥓", jamón: "🥓", ham: "🥓", presunto: "🥓", jambon: "🥓",
  pepperoni: "🍕",
  atun: "🐟", atún: "🐟", tuna: "🐟", atum: "🐟", thon: "🐟",
  huevo: "🥚", egg: "🥚", ovo: "🥚", œuf: "🥚",

  // Acompanhamentos
  patatas: "🍟", fries: "🍟", batata: "🍟", batatas: "🍟", frites: "🍟",
  pan: "🥖", bread: "🥖", pao: "🥖", pão: "🥖", pain: "🥖",
  pita: "🫓",
  arroz: "🍚", rice: "🍚",

  // Molhos / temperos
  salsa: "🥫", sauce: "🥫", molho: "🥫",
  oregano: "🌿", orégano: "🌿", oregan: "🌿",
  ajo: "🧄", garlic: "🧄", alho: "🧄", ail: "🧄",
  miel: "🍯", honey: "🍯", mel: "🍯",

  // Bebidas
  cocacola: "🥤", coca: "🥤", cola: "🥤",
  agua: "💧", water: "💧", eau: "💧",
  cerveza: "🍺", beer: "🍺", cerveja: "🍺", bière: "🍺",
  vino: "🍷", wine: "🍷", vinho: "🍷", vin: "🍷",
  cafe: "☕", café: "☕", coffee: "☕",

  // Doces
  chocolate: "🍫",
  fresa: "🍓", strawberry: "🍓", morango: "🍓", fraise: "🍓",
  vainilla: "🍦", vanilla: "🍦", baunilha: "🍦", vanille: "🍦",
};

const NORMALIZED = Object.entries(RAW).map(([k, v]) => [k.toLowerCase(), v] as const);

export function emojiFor(name: string, fallback: string = "🍴"): string {
  if (!name) return fallback;
  const n = name.toLowerCase().trim();
  // exact match
  for (const [k, v] of NORMALIZED) if (n === k) return v;
  // substring match (palavra contida)
  for (const [k, v] of NORMALIZED) if (n.includes(k)) return v;
  return fallback;
}