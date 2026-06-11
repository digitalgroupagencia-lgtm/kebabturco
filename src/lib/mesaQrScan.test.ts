import { describe, expect, it } from "vitest";
import { parseMesaQrToken } from "./mesaQrScan";

describe("parseMesaQrToken", () => {
  it("reads t param from full URL", () => {
    expect(
      parseMesaQrToken("https://kebabturco.net/?mode=table&table=12&t=abc-token-123&lang=es"),
    ).toBe("abc-token-123");
  });

  it("reads t param from partial query", () => {
    expect(parseMesaQrToken("?t=my-table-token")).toBe("my-table-token");
  });

  it("accepts raw token text", () => {
    expect(parseMesaQrToken("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    );
  });

  it("returns null for empty input", () => {
    expect(parseMesaQrToken("")).toBeNull();
    expect(parseMesaQrToken("   ")).toBeNull();
  });
});
