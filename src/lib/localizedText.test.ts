import { describe, expect, it } from "vitest";
import {
  buildLocalizedPayload,
  pickLocalizedText,
  readLocalized,
} from "./localizedText";

describe("localizedText", () => {
  it("picks requested language before primary fallback", () => {
    const name = { pt: "Frango", en: "Chicken", es: "Pollo" };
    expect(pickLocalizedText(name, "pt", "es")).toBe("Frango");
    expect(pickLocalizedText(name, "en", "es")).toBe("Chicken");
    expect(pickLocalizedText(name, "fr", "es")).toBe("Pollo");
  });

  it("does not copy primary into other langs on save", () => {
    const prev = { pt: "Frango", es: "Pollo", en: "Chicken" };
    const next = buildLocalizedPayload(prev, { pt: "Frango atualizado", es: "Pollo", en: "Chicken" }, "es");
    expect(next).toEqual({ pt: "Frango atualizado", es: "Pollo", en: "Chicken" });
  });

  it("preserves untouched langs when merging", () => {
    const prev = { pt: "Frango", es: "Pollo", fr: "Poulet" };
    const next = buildLocalizedPayload(prev, { en: "Chicken" }, "es");
    expect(readLocalized(next)).toMatchObject({ pt: "Frango", es: "Pollo", fr: "Poulet", en: "Chicken" });
  });
});
