import { describe, expect, it } from "vitest";
import { shouldUseCustomizationStepWizard } from "./customizationWizard";

describe("shouldUseCustomizationStepWizard", () => {
  it("uses wizard for multi-unit combos", () => {
    expect(shouldUseCustomizationStepWizard("combo", 0, true)).toBe(true);
  });

  it("uses wizard for simple products with 2+ groups", () => {
    expect(shouldUseCustomizationStepWizard("simple", 2, false)).toBe(true);
    expect(shouldUseCustomizationStepWizard("simple", 3, false)).toBe(true);
  });

  it("uses wizard for combos with at least one global group", () => {
    expect(shouldUseCustomizationStepWizard("combo", 1, false)).toBe(true);
  });

  it("keeps single scroll for simple products with 0-1 groups", () => {
    expect(shouldUseCustomizationStepWizard("simple", 0, false)).toBe(false);
    expect(shouldUseCustomizationStepWizard("simple", 1, false)).toBe(false);
  });
});
