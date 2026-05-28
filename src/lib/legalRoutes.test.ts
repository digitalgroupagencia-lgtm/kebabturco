import { describe, expect, it } from "vitest";
import { isLegalPublicPath, legalPageLoader, PUBLIC_LEGAL_PATHS } from "@/lib/legalRoutes";
import { isReservedAppPath } from "@/lib/appPaths";

describe("legalRoutes", () => {
  it("exposes all public legal paths", () => {
    expect(PUBLIC_LEGAL_PATHS).toEqual(
      expect.arrayContaining(["/privacy", "/terms", "/delete-account", "/support"]),
    );
  });

  it("recognises legal paths without trailing slash", () => {
    expect(isLegalPublicPath("/privacy")).toBe(true);
    expect(isLegalPublicPath("/support/")).toBe(true);
    expect(isLegalPublicPath("/admin")).toBe(false);
  });

  it("loads page modules for legal routes", () => {
    expect(legalPageLoader("/terms")).toBeTypeOf("function");
    expect(legalPageLoader("/unknown")).toBeNull();
  });

  it("registers legal segments as reserved app paths", () => {
    expect(isReservedAppPath("privacy")).toBe(true);
    expect(isReservedAppPath("delete-account")).toBe(true);
    expect(isReservedAppPath("support")).toBe(true);
  });
});
