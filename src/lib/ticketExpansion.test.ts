import { describe, it, expect } from "vitest";
import { cartItemToTicketItem, orderItemToTicketItem } from "./ticketExpansion";
import type { CartItem } from "@/customer/contexts/CartContext";

const baseCombo: CartItem = {
  id: "c1",
  productId: "p1",
  productName: { es: "Combo 4 Pan Pita", pt: "Combo 4 Pão Pita" },
  productImage: null,
  basePrice: 21,
  quantity: 1,
  sizeName: null,
  sizeAdd: 0,
  extras: [],
  removedIngredients: [],
  unitPrice: 21,
  totalPrice: 21,
  productType: "combo",
  configuration: {
    productType: "combo",
    globalSelections: [
      {
        groupId: "g-drink",
        groupName: { es: "Bebida" },
        groupKind: "choice",
        optionId: "coca",
        optionName: { es: "Coca-Cola 2L" },
        quantity: 1,
        priceDelta: 0,
      },
    ],
    comboUnits: [
      {
        unitIndex: 1,
        unitLabel: { es: "Pita 1" },
        selections: [
          { groupId: "g-meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "pollo", optionName: { es: "Pollo" }, quantity: 1, priceDelta: 0 },
          { groupId: "g-veg", groupName: { es: "Vegetales" }, groupKind: "removal", optionId: "cebolla", optionName: { es: "Cebolla" }, quantity: 1, priceDelta: 0 },
        ],
      },
      {
        unitIndex: 2,
        unitLabel: { es: "Pita 2" },
        selections: [
          { groupId: "g-meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "ternera", optionName: { es: "Ternera" }, quantity: 1, priceDelta: 0 },
          { groupId: "g-sauce", groupName: { es: "Salsa" }, groupKind: "choice", optionId: "picante", optionName: { es: "Picante" }, quantity: 1, priceDelta: 0 },
        ],
      },
    ],
  },
};

describe("ticketExpansion", () => {
  it("expande combos com prefixo Pita N reconhecido pelo builder", () => {
    const t = cartItemToTicketItem(baseCombo);
    const names = (t.extras ?? []).map((e) => e.name);
    expect(names).toContain("Pita 1: Pollo");
    expect(names).toContain("Pita 1: Sin Cebolla");
    expect(names).toContain("Pita 2: Ternera");
    expect(names).toContain("Pita 2: Picante");
    expect(names).toContain("Coca-Cola 2L");
  });

  it("reconstrói combo a partir de selections planas vindas do banco", () => {
    const t = orderItemToTicketItem({
      product_name: { es: "Combo 4 Pan Pita" },
      unit_price: 21,
      quantity: 1,
      selections: [
        { groupId: "g-meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "pollo", optionName: { es: "Pollo" }, quantity: 1, priceDelta: 0, unitIndex: 1, unitLabel: { es: "Pita 1" } },
        { groupId: "g-meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "ternera", optionName: { es: "Ternera" }, quantity: 1, priceDelta: 0, unitIndex: 2, unitLabel: { es: "Pita 2" } },
      ],
    });
    const names = (t.extras ?? []).map((e) => e.name);
    expect(names).toContain("Pita 1: Pollo");
    expect(names).toContain("Pita 2: Ternera");
  });

  it("corrige combos reais com unitIndex começando em zero", () => {
    const t = orderItemToTicketItem({
      product_name: "Combo 4 Pan Pita Mixto",
      unit_price: 21,
      quantity: 1,
      removed: ["Col", "Tomate", "Cebolla"],
      selections: [
        { groupId: "drink", groupName: { es: "Bebida" }, groupKind: "choice", optionId: "drink", optionName: { es: "Refresco Botella 2L" }, quantity: 1, priceDelta: 0, unitIndex: null },
      ],
      configuration: {
        productType: "combo",
        globalSelections: [
          { groupId: "drink", groupName: { es: "Bebida" }, groupKind: "choice", optionId: "drink", optionName: { es: "Refresco Botella 2L" }, quantity: 1, priceDelta: 0 },
        ],
        comboUnits: [
          { unitIndex: 0, unitLabel: { es: "Elige la carne del 1º pan pita" }, selections: [{ groupId: "meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "pollo", optionName: { es: "Pollo" }, quantity: 1, priceDelta: 0, unitIndex: 0 }] },
          { unitIndex: 1, unitLabel: { es: "Elige la carne del 2º pan pita" }, selections: [
            { groupId: "meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "ternera", optionName: { es: "Ternera" }, quantity: 1, priceDelta: 0, unitIndex: 1 },
            { groupId: "rem", groupName: { es: "Quitar" }, groupKind: "removal", optionId: "col", optionName: { es: "Col" }, quantity: 1, priceDelta: 0, unitIndex: 1 },
          ] },
          { unitIndex: 2, unitLabel: { es: "Elige la carne del 3º pan pita" }, selections: [
            { groupId: "meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "mixto", optionName: { es: "Mixto" }, quantity: 1, priceDelta: 0, unitIndex: 2 },
            { groupId: "rem", groupName: { es: "Quitar" }, groupKind: "removal", optionId: "tomate", optionName: { es: "Tomate" }, quantity: 1, priceDelta: 0, unitIndex: 2 },
          ] },
          { unitIndex: 3, unitLabel: { es: "Elige la carne del 4º pan pita" }, selections: [
            { groupId: "meat", groupName: { es: "Carne" }, groupKind: "choice", optionId: "ternera", optionName: { es: "Ternera" }, quantity: 1, priceDelta: 0, unitIndex: 3 },
            { groupId: "rem", groupName: { es: "Quitar" }, groupKind: "removal", optionId: "cebolla", optionName: { es: "Cebolla" }, quantity: 1, priceDelta: 0, unitIndex: 3 },
          ] },
        ],
      },
    });
    const names = (t.extras ?? []).map((e) => e.name);
    expect(names).toContain("Refresco Botella 2L");
    expect(names).toContain("Pita 1: Pollo");
    expect(names).toContain("Pita 2: Ternera");
    expect(names).toContain("Pita 2: Sin Col");
    expect(names).toContain("Pita 3: Mixto");
    expect(names).toContain("Pita 3: Sin Tomate");
    expect(names).toContain("Pita 4: Ternera");
    expect(names).toContain("Pita 4: Sin Cebolla");
    expect(t.removed).toEqual([]);
  });

  it("agrupa removidos por pizza no combo", () => {
    const t = cartItemToTicketItem({
      ...baseCombo,
      productName: { es: "Combo 3 Pizzas Kebab" },
      configuration: {
        productType: "combo",
        globalSelections: [
          {
            groupId: "g-drink",
            groupName: { es: "Bebida" },
            groupKind: "choice",
            optionId: "coca",
            optionName: { es: "Coca-Cola 2L" },
            quantity: 1,
            priceDelta: 0,
          },
        ],
        comboUnits: [
          {
            unitIndex: 0,
            unitLabel: { es: "Elige el sabor de la 1ª pizza" },
            selections: [
              { groupId: "g-flavor", groupName: { es: "Sabor" }, groupKind: "choice", optionId: "kebab", optionName: { es: "Kebab" }, quantity: 1, priceDelta: 0 },
              { groupId: "g-rem", groupName: { es: "Quitar" }, groupKind: "removal", optionId: "cebolla", optionName: { es: "Cebolla" }, quantity: 1, priceDelta: 0 },
            ],
          },
          {
            unitIndex: 1,
            unitLabel: { es: "Elige el sabor de la 2ª pizza" },
            selections: [
              { groupId: "g-flavor", groupName: { es: "Sabor" }, groupKind: "choice", optionId: "mixta", optionName: { es: "Mixta" }, quantity: 1, priceDelta: 0 },
              { groupId: "g-rem", groupName: { es: "Quitar" }, groupKind: "removal", optionId: "tomate", optionName: { es: "Tomate" }, quantity: 1, priceDelta: 0 },
            ],
          },
        ],
      },
    });
    const names = (t.extras ?? []).map((e) => e.name);
    expect(names).toContain("Pizza 1: Kebab");
    expect(names).toContain("Pizza 1: Sin Cebolla");
    expect(names).toContain("Pizza 2: Mixta");
    expect(names).toContain("Pizza 2: Sin Tomate");
    expect(t.removed).toEqual([]);
  });

  it("não expande produtos simples", () => {
    const t = cartItemToTicketItem({
      ...baseCombo,
      productType: "simple",
      configuration: undefined,
      extras: [{ id: "x", name: { es: "Queijo extra" }, price: 1, quantity: 1 }],
      removedIngredients: ["cebola"],
    });
    expect(t.extras).toEqual([{ name: "Queijo extra", price: 1 }]);
    expect(t.removed).toEqual(["cebola"]);
  });
});
