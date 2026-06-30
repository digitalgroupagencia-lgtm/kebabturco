import { describe, expect, it } from "vitest";
import { looksLikeUntranslatedCopy, translateMenuGlossary } from "./menuFoodGlossary";

describe("menuFoodGlossary", () => {
  it("translates common product names to English", () => {
    expect(translateMenuGlossary("Combo 10 Piezas Pollo Crispy", "es", "en")).toBe(
      "Combo 10 Pieces Crispy Chicken",
    );
    expect(translateMenuGlossary("Pan Pita", "es", "en")).toBe("Pita Bread");
    expect(translateMenuGlossary("Pollo", "es", "en")).toBe("Chicken");
  });

  it("flags Spanish copy posing as English", () => {
    expect(looksLikeUntranslatedCopy("Pollo", "Pollo", "en", "es")).toBe(true);
    expect(looksLikeUntranslatedCopy("Chicken", "Pollo", "en", "es")).toBe(false);
  });
});
