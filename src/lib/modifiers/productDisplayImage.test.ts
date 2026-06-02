import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import { resolveMenuProductDisplayImage } from "./productDisplayImage";

function drink(id: string, name: string, image: string): MenuProduct {
  return {
    id,
    name: { es: name, pt: name, en: name },
    description: { es: "", pt: "", en: "" },
    price: 1.5,
    image,
    category: "bebidas",
    categorySlug: "bebidas",
    isBestseller: false,
    isPromo: false,
    sortOrder: 0,
  } as MenuProduct;
}

describe("resolveMenuProductDisplayImage", () => {
  it("assigns distinct images when drinks wrongly share the same photo", () => {
    const shared = "https://cdn.example.com/wrong-drink.jpg";
    const menu = [
      drink("d1", "Agua Grande", "https://cdn.example.com/agua-grande.jpg"),
      drink("d2", "Zumo Bi Frutas", "https://cdn.example.com/zumo.jpg"),
      drink("d3", "Refresco Lata 33cl", shared),
      drink("d4", "Agua Pequeña", shared),
    ];

    expect(resolveMenuProductDisplayImage(menu[0], menu)).toContain("agua-grande");
    expect(resolveMenuProductDisplayImage(menu[1], menu)).toContain("zumo");
    expect(resolveMenuProductDisplayImage(menu[2], menu)).toBe("/product-placeholder.svg");
    expect(resolveMenuProductDisplayImage(menu[3], menu)).not.toContain("agua-grande");
  });
});
