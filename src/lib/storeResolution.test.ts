import { describe, expect, it } from "vitest";
import {
  KEBAB_FALLBACK_STORE_ID,
  isGenericFallbackStores,
  mergeStoreLists,
  mergeStoreOption,
  preferResolvedStores,
} from "./storeResolution";

const gandia = {
  id: "aaaa-1111",
  name: "Gandia",
  address: "Centro",
  image_url: "https://cdn.example/gandia.png",
  short_description: "Lunes a Domingo, 12:00–00:00",
};

const playa = {
  id: "bbbb-2222",
  name: "Playa Gandia",
  address: "Playa",
  image_url: "https://cdn.example/playa.png",
  short_description: "Lunes a Domingo, 12:00–00:00",
};

const fallback = {
  id: KEBAB_FALLBACK_STORE_ID,
  name: "Kebab Turco",
  address: null,
  image_url: null,
  short_description: null,
};

describe("storeResolution", () => {
  it("detects generic fallback store list", () => {
    expect(isGenericFallbackStores([fallback])).toBe(true);
    expect(isGenericFallbackStores([gandia, playa])).toBe(false);
  });

  it("merges store fields without dropping configured image", () => {
    expect(
      mergeStoreOption(gandia, {
        ...gandia,
        image_url: null,
        name: "Gandia",
      }).image_url,
    ).toBe(gandia.image_url);
  });

  it("keeps real stores when fallback tries to replace them", () => {
    const real = [gandia, playa];
    expect(mergeStoreLists(real, [fallback])).toEqual(real);
    expect(preferResolvedStores(real, [fallback])).toEqual(real);
  });

  it("accepts richer incoming data for the same store ids", () => {
    const incomplete = [{ ...gandia, image_url: null, short_description: null }];
    const complete = [gandia];
    expect(mergeStoreLists(incomplete, complete)).toEqual(complete);
  });
});
