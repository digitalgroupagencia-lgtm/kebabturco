import { describe, expect, it } from "vitest";
import {
  buildPublicCanonicalUrl,
  PUBLIC_SITEMAP_ENTRIES,
  shouldNoindexPath,
} from "@/lib/seoSite";

describe("seoSite", () => {
  it("lists public sitemap entries", () => {
    expect(PUBLIC_SITEMAP_ENTRIES.map((e) => e.path)).toEqual([
      "/",
      "/menu",
      "/cardapio",
      "/privacy",
      "/terms",
      "/delete-account",
      "/support",
      "/install",
    ]);
  });

  it("builds canonical urls", () => {
    expect(buildPublicCanonicalUrl("/")).toBe("https://kebabturco.net/");
    expect(buildPublicCanonicalUrl("/menu")).toBe("https://kebabturco.net/menu");
  });

  it("noindexes internal and checkout routes", () => {
    expect(shouldNoindexPath("/panel")).toBe(true);
    expect(shouldNoindexPath("/admin/settings")).toBe(true);
    expect(shouldNoindexPath("/checkout")).toBe(true);
    expect(shouldNoindexPath("/", "?screen=payment")).toBe(true);
    expect(shouldNoindexPath("/menu")).toBe(false);
    expect(shouldNoindexPath("/privacy")).toBe(false);
  });
});
