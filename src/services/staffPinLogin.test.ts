import { describe, expect, it } from "vitest";
import { isStaleStaffPinServerError } from "@/services/staffPinLogin";

describe("isStaleStaffPinServerError", () => {
  it("detects legacy server rejection for pins with #", () => {
    expect(isStaleStaffPinServerError("Loja e código inválidos", "256656#")).toBe(true);
    expect(isStaleStaffPinServerError("Tienda o código no válidos", "256656#")).toBe(true);
  });

  it("ignores the same message when pin has no #", () => {
    expect(isStaleStaffPinServerError("Loja e código inválidos", "256656")).toBe(false);
  });
});
