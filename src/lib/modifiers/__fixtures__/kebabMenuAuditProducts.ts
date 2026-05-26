import type { MenuProduct } from "@/hooks/useMenuData";

const drink = (id: string, name: string, slug = "bebidas"): MenuProduct =>
  ({
    id,
    name: { es: name, pt: name, en: name },
    description: { es: "", pt: "", en: "" },
    price: 2,
    image: "",
    category: "drinks",
    categorySlug: slug,
    extras: [],
    ingredients: [],
  }) as MenuProduct;

const food = (
  id: string,
  name: string,
  desc: string,
  extra: Partial<MenuProduct> = {},
): MenuProduct =>
  ({
    id,
    name: { es: name, pt: name, en: name },
    description: { es: desc, pt: desc, en: desc },
    price: 8.5,
    image: "",
    category: "food",
    categorySlug: extra.categorySlug || "pan-pita-kebab",
    extras: extra.extras || [],
    ingredients: extra.ingredients || ["Lechuga", "Col", "Tomate"],
    ...extra,
  }) as MenuProduct;

/** Catálogo bebidas partilhado nos testes de combo/menú. */
export const KEBAB_DRINK_CATALOG: MenuProduct[] = [
  drink("d-coca-2l", "Coca-Cola 2L"),
  drink("d-fanta-2l", "Fanta Naranja 2L"),
  drink("d-sprite-2l", "Sprite 2L"),
  drink("d-nestea-2l", "Nestea 2L"),
  drink("d-coca-33", "Coca-Cola Lata 33cl"),
  drink("d-fanta-33", "Fanta Naranja Lata 33cl"),
  drink("d-sprite-33", "Sprite Lata 33cl"),
  drink("d-agua", "Agua Mineral"),
];

/**
 * Conjunto representativo alinhado com a auditoria de 93 produtos (prioridades do plano).
 * Cobre bebidas, pitas, rollos, combos fechados, multi-unidade, menús, pizzas e patatas.
 */
export const KEBAB_AUDIT_PRODUCTS: MenuProduct[] = [
  ...KEBAB_DRINK_CATALOG,
  food("1", "Pan de Pita de Pollo", "Carne de pollo, lechuga, col, patatas fritas"),
  food("2", "Pan de Pita de Ternera", "Carne de ternera, lechuga, col, patatas fritas"),
  food("3", "Pan de Pita Mixto", "Pollo y ternera, lechuga, patatas fritas"),
  food("4", "Pan Vegetal", "Falafel, lechuga, col", { categorySlug: "pan-pita-kebab" }),
  food("5", "Pan de Pita Solo Carne", "Elige pollo o ternera, lechuga, patatas fritas"),
  food("6", "Pan de Pita Especial", "Elige pollo o ternera, queso, patatas fritas"),
  food("c10", "Combo 10 Piezas Pollo Crispy", "10 piezas + patatas fritas + bebida 2L a elegir", {
    categorySlug: "ofertas-combo",
    productType: "combo",
    comboUnitCount: 0,
  }),
  food("c4p", "Combo 4 Pan Pita Mixto", "4 pan pita + patatas + bebida 2L", {
    categorySlug: "ofertas-combo",
    productType: "combo",
    comboUnitCount: 4,
    unitLabel: { es: "Pan pita", pt: "Pan pita", en: "Pan pita", fr: "Pan pita" },
  }),
  food("c3z", "Combo 3 Pizzas Kebab", "3 pizzas + patatas + bebida 2L", {
    categorySlug: "ofertas-combo",
    productType: "combo",
    comboUnitCount: 3,
  }),
  food("c4r", "Combo 4 Rollos Kebab", "4 rollos + patatas + bebida 2L", {
    categorySlug: "ofertas-combo",
    productType: "combo",
    comboUnitCount: 4,
    unitLabel: { es: "Rollo", pt: "Rollo", en: "Roll", fr: "Roulé" },
  }),
  food("c4pc", "Combo 4 Piezas Pollo Crispy", "4 piezas + patatas + refresco 33cl", {
    categorySlug: "ofertas-combo",
    productType: "combo",
    comboUnitCount: 0,
  }),
  food("r1", "Rollo de Pollo", "Carne de pollo, patatas fritas", { categorySlug: "rollo-kebab" }),
  food("r2", "Rollo de Ternera", "Carne de ternera, patatas fritas", { categorySlug: "rollo-kebab" }),
  food("r3", "Rollo Mixto", "Pollo y ternera, patatas fritas", { categorySlug: "rollo-kebab" }),
  food("m1", "Menú Nuggets", "Nuggets + patatas + lata 33cl a elegir", {
    categorySlug: "menus",
    productType: "combo",
    comboUnitCount: 0,
  }),
  food("m2", "Menú Alitas", "Alitas + patatas + refresco 33cl", {
    categorySlug: "menus",
    productType: "combo",
    comboUnitCount: 0,
  }),
  food("m3", "Menú Pizza Kebab", "Pizza + patatas + bebida", {
    categorySlug: "menus",
    productType: "combo",
    comboUnitCount: 0,
  }),
  food("pz1", "Pizza Kebab", "Kebab y queso", { categorySlug: "pizzas" }),
  food("pt1", "Patatas Bravas", "Patatas bravas con salsa", { categorySlug: "patatas" }),
  food("pt2", "Patatas Fritas", "Ración de patatas", { categorySlug: "patatas" }),
  food("sal1", "Ensalada Mixta", "Lechuga, tomate, cebolla", { categorySlug: "ensaladas" }),
];
