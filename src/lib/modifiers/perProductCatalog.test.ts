import { describe, expect, it } from "vitest";
import type { MenuProduct } from "@/hooks/useMenuData";
import { KEBAB_AUDIT_PRODUCTS } from "./__fixtures__/kebabMenuAuditProducts";
import { safeSynthesizeModifierConfig } from "./safeCustomization";
import {
  drinkLabelMatchesRule,
  resolveDrinkSizeRuleForProduct,
} from "./drinkSizeRules";
import { descriptionIncludesDrink, resolveIsComboProduct } from "./productClassification";
import { productIncludesSidePotato, shouldOfferPotatoExtra, COMBO_POTATO_UPGRADE_PRICE } from "./potatoRules";
import {
  resolveDrinkOptionImage,
  resolvePotatoOptionImage,
} from "./optionCatalog";
import type { ModifierGroup } from "./types";

/**
 * Testes por produto: garantem que cada item do cardápio expõe os grupos de
 * modificadores correctos (batatas e bebidas) e que cada opção é enriquecida
 * com a imagem real do menu (evita regressões tipo "só aparece 1 opção" ou
 * "preço errado" depois de mudanças no synth/filter).
 */

const labelOf = (p: MenuProduct) => p.name.es || p.name.pt || p.id;
const optLabel = (o: { name: Record<string, string> }) =>
  (o.name.es || o.name.pt || "").toLowerCase();

const MENU = KEBAB_AUDIT_PRODUCTS;

function getGroups(product: MenuProduct): ModifierGroup[] {
  const config = safeSynthesizeModifierConfig(product, MENU);
  return config?.groups ?? [];
}

const findPotatoGroup = (groups: ModifierGroup[]) =>
  groups.find(
    (g) =>
      g.groupKind === "substitution" ||
      /patata|acompa|batata/i.test(`${g.name.es || ""} ${g.name.pt || ""}`),
  );

const findDrinkGroup = (groups: ModifierGroup[]) =>
  groups.find((g) =>
    /bebida|refresco|drink|boisson/i.test(`${g.name.es || ""} ${g.name.pt || ""}`),
  );

describe.each(MENU.map((p) => [labelOf(p), p] as const))(
  "produto: %s",
  (_label, product) => {
    const groups = getGroups(product);
    const isCombo = resolveIsComboProduct(product);
    const includesPotato = productIncludesSidePotato(product);
    const hasDrinkInDesc = descriptionIncludesDrink(product);
    const drinkRule = resolveDrinkSizeRuleForProduct(product);

    if (includesPotato) {
      it("expõe grupo de batata com fritas incluidas + bravas + lux", () => {
        const potato = findPotatoGroup(groups);
        expect(potato, "grupo de batata ausente").toBeTruthy();
        const labels = (potato!.options || []).map(optLabel).join(" | ");
        expect(labels).toMatch(/fritas|incluid/);
        expect(labels).toMatch(/bravas/);
        expect(labels).toMatch(/lux|deluxe/);
      });

      it("upgrades de batata custam exactamente +0,50€ (nunca +1,50€)", () => {
        const potato = findPotatoGroup(groups);
        const upgrades = (potato?.options || []).filter((o) => o.priceDelta > 0);
        expect(upgrades.length).toBeGreaterThanOrEqual(2);
        upgrades.forEach((opt) => {
          expect(
            opt.priceDelta,
            `opção "${optLabel(opt)}" com preço errado`,
          ).toBe(COMBO_POTATO_UPGRADE_PRICE);
        });
      });

      it("imagens dos upgrades batem com produto real do menu", () => {
        const potato = findPotatoGroup(groups);
        for (const opt of potato?.options || []) {
          const expected = resolvePotatoOptionImage(opt, MENU);
          if (expected) {
            expect(
              opt.imageUrl,
              `opção "${optLabel(opt)}" sem imagem enriquecida`,
            ).toBe(expected);
          }
        }
      });
    }

    if (isCombo && hasDrinkInDesc && drinkRule) {
      it(`grupo de bebida só mostra opções compatíveis com regra ${drinkRule}`, () => {
        const drink = findDrinkGroup(groups);
        expect(drink, "grupo de bebida ausente em combo com bebida").toBeTruthy();
        const options = drink!.options || [];
        expect(options.length).toBeGreaterThanOrEqual(2);
        for (const opt of options) {
          const label = opt.name.es || opt.name.pt || "";
          expect(
            drinkLabelMatchesRule(label, drinkRule),
            `bebida "${label}" não respeita regra ${drinkRule}`,
          ).toBe(true);
        }
      });

      it("imagens das bebidas batem com produto real do menu quando existir", () => {
        const drink = findDrinkGroup(groups);
        for (const opt of drink?.options || []) {
          const expected = resolveDrinkOptionImage(opt, MENU);
          if (expected) {
            expect(
              opt.imageUrl,
              `bebida "${optLabel(opt)}" sem imagem enriquecida`,
            ).toBe(expected);
          }
        }
      });
    }

    if (!includesPotato && shouldOfferPotatoExtra(product)) {
      it("oferece todas as batatas do cardápio como extra opcional", () => {
        const potato = groups.find((g) => g.id.includes("potato-extra"));
        expect(potato, `grupo "añadir patatas" ausente`).toBeTruthy();
        const labels = (potato!.options || []).map(optLabel).join(" | ");
        expect(labels).toMatch(/fritas/);
        expect(labels).toMatch(/bravas/);
        expect(labels).toMatch(/lux/);
        for (const opt of potato!.options || []) {
          expect(
            opt.priceDelta,
            `extra "${optLabel(opt)}" deveria ter o preço do cardápio`,
          ).toBeGreaterThan(0);
        }
      });
    }
  },
);
