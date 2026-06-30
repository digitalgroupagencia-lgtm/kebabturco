import type { AppLang } from "@/lib/localizedText";
import { setCachedMenuTranslations } from "@/lib/menuTranslationCache";

/** Traduções fixas do cardápio kebab — instantâneas, sem esperar pela rede. */
const PHRASES: Partial<Record<`${AppLang}>${AppLang}`, Record<string, string>>> = {
  "es>en": {
    "Ofertas Combo": "Combo Offers",
    "Ofertas combo": "Combo Offers",
    "Pan Pita": "Pita Bread",
    "Rollo Kebab": "Kebab Roll",
    "Rollos Kebab": "Kebab Rolls",
    "Pollo Crispy": "Crispy Chicken",
    "Patatas": "Fries",
    "Ensaladas": "Salads",
    "Platos": "Dishes",
    "Bebidas": "Drinks",
    "Postres": "Desserts",
    "Elige tu refresco": "Choose your drink",
    "Escolhe o refresco": "Choose your drink",
    "Elige la carne": "Choose meat",
    "Escolhe a carne": "Choose meat",
    "Temperatura": "Temperature",
    "Hielo": "Ice",
    "Con hielo": "With ice",
    "Sin hielo": "No ice",
    "Fría / Gelada": "Chilled",
    "Fria / Gelada": "Chilled",
    "Natural": "Room temperature",
    "Quitar ingredientes": "Remove ingredients",
    "Extras": "Extras",
    "Bebida": "Drink",
    "Bebida incluida": "Included drink",
    "Coca-Cola 2L": "Coca-Cola 2L",
    "Fanta Naranja 2L": "Fanta Orange 2L",
    "Sprite 2L": "Sprite 2L",
    "Nestea 2L": "Nestea 2L",
    "Coca-Cola Lata 33cl": "Coca-Cola Can 33cl",
    "Fanta Naranja Lata 33cl": "Fanta Orange Can 33cl",
    "Sprite Lata 33cl": "Sprite Can 33cl",
    "Refresco Lata 33cl": "Soda Can 33cl",
    "Refresco Botella 2L": "Soda Bottle 2L",
    "Refresco Botella 1.25L": "Soda Bottle 1.25L",
    "Agua Pequeña": "Small Water",
    "Agua Grande": "Large Water",
    "Agua Mineral": "Mineral Water",
    "Zumo Bi Frutas": "Mixed Fruit Juice",
    "Monster Pequeño": "Small Monster",
    "Pan de Pita de Pollo": "Chicken Pita Bread",
    "Pan de Pita de Ternera": "Beef Pita Bread",
    "Pan de Pita Mixto": "Mixed Pita Bread",
    "Pan Vegetal": "Vegetable Pita Bread",
    "Combo 10 Piezas Pollo Crispy": "Combo 10 Pieces Crispy Chicken",
    "Combo 4 Pan Pita Mixto": "Combo 4 Mixed Pita Bread",
    "Combo 3 Pizzas Kebab": "Combo 3 Kebab Pizzas",
    "Combo 4 Rollos Kebab": "Combo 4 Kebab Rolls",
    "Patatas Fritas": "French Fries",
    "Patatas Bravas": "Spicy Fries",
    "Patatas Deluxe": "Deluxe Fries",
    "Patatas con Queso": "Cheese Fries",
    "Sin gluten": "Gluten-free",
    "Picante": "Spicy",
    "Muy picante": "Very spicy",
    "Sin picante": "Not spicy",
    "Pollo": "Chicken",
    "Ternera": "Beef",
    "Mixto": "Mixed",
    "Lechuga": "Lettuce",
    "Col": "Cabbage",
    "Tomate": "Tomato",
    "Cebolla": "Onion",
    "Pepino": "Cucumber",
    "Maíz": "Corn",
    "Queso": "Cheese",
    "Salsa": "Sauce",
    "Salsa de yogur": "Yogurt sauce",
    "Salsa picante": "Hot sauce",
    "Salsa blanca": "White sauce",
    "Salsa roja": "Red sauce",
    "Aceitunas": "Olives",
    "Huevo": "Egg",
    "Bacon": "Bacon",
    "Champiñones": "Mushrooms",
    "Champinones": "Mushrooms",
    "Pan": "Bread",
    "Arroz": "Rice",
    "Ajo": "Garlic",
    "Orégano": "Oregano",
    "Oregano": "Oregano",
    "Zanahoria": "Carrot",
    "Carne de pollo": "Chicken meat",
    "Carne de ternera": "Beef meat",
    "Pollo y ternera": "Chicken and beef",
    "Patatas fritas": "French fries",
    "bebida 2L a elegir": "choose a 2L drink",
    "bebida 2l a elegir": "choose a 2L drink",
    "Oferta": "Offer",
    "OFERTA": "OFFER",
  },
  "es>pt": {
    "Pollo": "Frango",
    "Ternera": "Vaca",
    "Mixto": "Misto",
    "Patatas": "Batatas",
    "Ensaladas": "Saladas",
    "Bebidas": "Bebidas",
    "Oferta": "Promoção",
    "Lechuga": "Alface",
    "Col": "Couve",
    "Tomate": "Tomate",
    "Cebolla": "Cebola",
    "Queso": "Queijo",
    "Pan Pita": "Pão Pita",
    "Rollo Kebab": "Rolo Kebab",
  },
  "es>fr": {
    "Pollo": "Poulet",
    "Ternera": "Bœuf",
    "Mixto": "Mixte",
    "Patatas": "Frites",
    "Ensaladas": "Salades",
    "Bebidas": "Boissons",
    "Oferta": "Offre",
    "Pan Pita": "Pain Pita",
    "Rollo Kebab": "Rouleau Kebab",
  },
};

/** Substituição palavra a palavra (ordem: expressões mais longas primeiro). */
const WORDS: Partial<Record<`${AppLang}>${AppLang}`, [string, string][]>> = {
  "es>en": [
    ["Piezas", "Pieces"],
    ["piezas", "pieces"],
    ["Pollo", "Chicken"],
    ["pollo", "chicken"],
    ["Ternera", "Beef"],
    ["ternera", "beef"],
    ["Mixto", "Mixed"],
    ["mixto", "mixed"],
    ["Crispy", "Crispy"],
    ["Pita", "Pita"],
    ["Pan", "Bread"],
    ["Rollo", "Roll"],
    ["Rollos", "Rolls"],
    ["rollo", "roll"],
    ["rollos", "rolls"],
    ["Patatas", "Fries"],
    ["patatas", "fries"],
    ["Pizzas", "Pizzas"],
    ["Pizza", "Pizza"],
    ["Kebab", "Kebab"],
    ["Combo", "Combo"],
    ["Burguer", "Burger"],
    ["Hamburguesa", "Burger"],
    ["Ensalada", "Salad"],
    ["Ensaladas", "Salads"],
    ["Refresco", "Soda"],
    ["refresco", "soda"],
    ["Botella", "Bottle"],
    ["botella", "bottle"],
    ["Lata", "Can"],
    ["lata", "can"],
    ["Agua", "Water"],
    ["agua", "water"],
    ["Zumo", "Juice"],
    ["zumo", "juice"],
    ["Naranja", "Orange"],
    ["Limón", "Lemon"],
    ["Vegetal", "Vegetable"],
    ["Especial", "Special"],
    ["Carne", "Meat"],
    ["carne", "meat"],
    ["de", "of"],
    ["con", "with"],
    ["sin", "without"],
    ["y", "and"],
    ["a elegir", "to choose"],
  ],
};

function phraseKey(from: AppLang, to: AppLang): `${AppLang}>${AppLang}` {
  return `${from}>${to}`;
}

function normalizeKey(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function translateMenuGlossary(text: string, from: AppLang, to: AppLang): string | null {
  if (from === to) return text;
  const raw = normalizeKey(text);
  if (!raw) return null;

  const key = phraseKey(from, to);
  const exact = PHRASES[key]?.[raw] ?? PHRASES[key]?.[raw.replace(/\.$/, "")];
  if (exact) return exact;

  const words = WORDS[key];
  if (!words?.length) return null;

  let out = raw;
  for (const [fromWord, toWord] of words) {
    const re = new RegExp(`\\b${fromWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    out = out.replace(re, toWord);
  }

  return out !== raw ? out : null;
}

const SPANISH_MARKERS =
  /\b(pollo|ternera|patatas|rollo|lechuga|cebolla|queso|bebida|refresco|ensalada|hamburguesa|ternera|mixto|picante|sin|con|de la|de el|elige|escolhe|pan de pita|piezas|botella|lata|agua|zumo|oferta)\b/i;

/** Valor em «en» que ainda é espanhol (cópia do original ou palavras ES). */
export function looksLikeUntranslatedCopy(value: string, source: string, lang: AppLang, primaryLang: AppLang): boolean {
  const v = value.trim();
  const s = source.trim();
  if (!v) return true;
  if (v === s) return true;
  if (lang === "en" && primaryLang === "es" && SPANISH_MARKERS.test(v)) {
    const fixed = translateMenuGlossary(v, "es", "en");
    if (fixed && fixed !== v) return true;
  }
  return false;
}

/** Preenche a cache local com glossário para abrir o menu em EN sem espera. */
export function seedMenuGlossaryCache(texts: string[], from: AppLang, to: AppLang): Record<string, string> {
  if (from === to) return {};
  const seeded: Record<string, string> = {};
  for (const text of texts) {
    const translated = translateMenuGlossary(text, from, to);
    if (translated && translated !== text) seeded[text] = translated;
  }
  if (Object.keys(seeded).length) setCachedMenuTranslations(from, to, seeded);
  return seeded;
}

export function resolveMenuTextForLang(
  text: string,
  from: AppLang,
  to: AppLang,
  cached?: string | null,
): string {
  const trimmed = text.trim();
  if (!trimmed || from === to) return trimmed;
  if (cached?.trim()) return cached.trim();
  return translateMenuGlossary(trimmed, from, to) ?? trimmed;
}
