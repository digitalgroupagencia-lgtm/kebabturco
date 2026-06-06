type CartItemLike = {
  id?: string;
  name?: string;
  title?: string;
  category?: string;
  categoryName?: string;
  quantity?: number;
  modifiers?: Array<{
    id?: string;
    name?: string;
    title?: string;
    groupName?: string;
  }>;
};

type ShouldShowUpsellStepInput = {
  stepType: "potatoes" | "drink" | "sauce" | "dessert" | string;
  cartItems: CartItemLike[];
  currentSelections?: CartItemLike[];
  selectedModifiers?: CartItemLike["modifiers"];
  productCategory?: string;
};

const potatoKeywords = [
  "patata",
  "patatas",
  "papas",
  "fries",
  "fritas",
  "bravas",
  "potato",
];

function normalize(value?: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function itemMatchesKeywords(item: CartItemLike, keywords: string[]) {
  const haystack = [
    item.name,
    item.title,
    item.category,
    item.categoryName,
    ...(item.modifiers || []).flatMap((m) => [m.name, m.title, m.groupName]),
  ]
    .map(normalize)
    .join(" ");

  return keywords.some((keyword) => haystack.includes(normalize(keyword)));
}

function modifiersMatchKeywords(
  modifiers: CartItemLike["modifiers"] = [],
  keywords: string[],
) {
  const haystack = modifiers
    .flatMap((m) => [m.name, m.title, m.groupName])
    .map(normalize)
    .join(" ");

  return keywords.some((keyword) => haystack.includes(normalize(keyword)));
}

export function shouldShowUpsellStep({
  stepType,
  cartItems,
  currentSelections = [],
  selectedModifiers = [],
  productCategory,
}: ShouldShowUpsellStepInput) {
  if (stepType !== "potatoes") {
    return true;
  }

  const categoryHasPotatoes = potatoKeywords.some((keyword) =>
    normalize(productCategory).includes(normalize(keyword)),
  );

  const cartHasPotatoes = cartItems.some((item) =>
    itemMatchesKeywords(item, potatoKeywords),
  );

  const currentSelectionHasPotatoes = currentSelections.some((item) =>
    itemMatchesKeywords(item, potatoKeywords),
  );

  const selectedModifierHasPotatoes = modifiersMatchKeywords(
    selectedModifiers,
    potatoKeywords,
  );

  return !(
    categoryHasPotatoes ||
    cartHasPotatoes ||
    currentSelectionHasPotatoes ||
    selectedModifierHasPotatoes
  );
}
