import { describe, expect, it } from "vitest";
import { sanitizeModifierGroup } from "./sanitizeGroups";
import type { ModifierGroup } from "./types";

const baseGroup = (partial: Partial<ModifierGroup> & Pick<ModifierGroup, "id">): ModifierGroup => ({
  storeId: "s1",
  name: { es: "Test", pt: "Test", en: "Test", fr: "Test" },
  description: {},
  groupKind: "choice",
  selectionMode: "single",
  minSelect: 1,
  maxSelect: 1,
  isRequired: true,
  sortOrder: 0,
  repeatPerUnit: false,
  linkSortOrder: 0,
  options: [],
  ...partial,
});

describe("sanitizeModifierGroup", () => {
  it("adds included side when substitution is required and all options are paid", () => {
    const group = baseGroup({
      id: "g1",
      groupKind: "substitution",
      options: [
        {
          id: "o1",
          groupId: "g1",
          name: { es: "Bravas", pt: "Bravas", en: "Bravas", fr: "Bravas" },
          priceDelta: 0.5,
          maxQty: 1,
          isDefault: false,
          sortOrder: 0,
        },
        {
          id: "o2",
          groupId: "g1",
          name: { es: "Lux", pt: "Lux", en: "Lux", fr: "Lux" },
          priceDelta: 0.5,
          maxQty: 1,
          isDefault: false,
          sortOrder: 1,
        },
      ],
    });

    const out = sanitizeModifierGroup(group);
    expect(out.options.some((o) => o.priceDelta === 0 && o.isDefault)).toBe(true);
    expect(out.options[0].priceDelta).toBe(0);
  });

  it("selects first option when required group has no default", () => {
    const group = baseGroup({
      id: "g2",
      groupKind: "choice",
      options: [
        {
          id: "o1",
          groupId: "g2",
          name: { es: "Pollo", pt: "Pollo", en: "Pollo", fr: "Pollo" },
          priceDelta: 0,
          maxQty: 1,
          isDefault: false,
          sortOrder: 0,
        },
      ],
    });

    const out = sanitizeModifierGroup(group);
    expect(out.options[0].isDefault).toBe(true);
  });

  it("disables required flag when group has no options", () => {
    const group = baseGroup({ id: "g3", options: [] });
    const out = sanitizeModifierGroup(group);
    expect(out.isRequired).toBe(false);
    expect(out.minSelect).toBe(0);
  });
});
