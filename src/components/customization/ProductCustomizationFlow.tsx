import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ScreenHeader from "@/components/ScreenHeader";
import QuantitySelector from "@/components/QuantitySelector";
import ChoiceGroupSection from "@/components/customization/ChoiceGroupSection";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MenuProduct } from "@/hooks/useMenuData";
import type { ProductModifierConfig, SelectionState, CartConfiguration } from "@/lib/modifiers/types";
import { buildSelectionsFromState, validateAllGroups } from "@/lib/modifiers/validation";
import { computeUnitPrice } from "@/lib/modifiers/pricing";
import { flattenConfiguration, selectionsToLegacyFields } from "@/lib/modifiers/legacyBridge";
import { sortModifierGroups } from "@/lib/modifiers/groupOrder";
import { buildDefaultSelectionState, buildDefaultUnitStates } from "@/lib/modifiers/defaults";
import { parseProductCode } from "@/lib/parseProductCode";
import type { CartItem } from "@/contexts/CartContext";

type Props = {
  product: MenuProduct;
  config: ProductModifierConfig;
  editingItem?: CartItem;
  onBack: () => void;
};

import {
  comboUnitStepTitle,
} from "@/lib/modifiers/comboProductRules";

export default function ProductCustomizationFlow({ product, config, editingItem, onBack }: Props) {
  const { t, tProduct } = useLanguage();
  const { addItem, updateItem } = useCart();

  const safeGroups = config.groups ?? [];
  const basePrice = Number(product.price) || 0;
  const productImage = product.image || "/placeholder.svg";

  const globalGroups = useMemo(
    () => sortModifierGroups(safeGroups.filter((g) => !g.repeatPerUnit)),
    [safeGroups],
  );
  const unitGroups = useMemo(
    () => sortModifierGroups(safeGroups.filter((g) => g.repeatPerUnit)),
    [safeGroups],
  );
  const isCombo = config.productType === "combo" && config.comboUnitCount > 1 && unitGroups.length > 0;

  const [quantity, setQuantity] = useState(1);
  const [globalState, setGlobalState] = useState<SelectionState>(() => new Map());
  const [unitStates, setUnitStates] = useState<SelectionState[]>(() =>
    Array.from({ length: config.comboUnitCount || 0 }, () => new Map()),
  );
  const [comboStep, setComboStep] = useState(0);
  const [note, setNote] = useState("");

  const totalSteps = isCombo ? 1 + config.comboUnitCount : 1;
  const onUnitStep = isCombo && comboStep > 0;
  const currentUnitIndex = onUnitStep ? comboStep - 1 : null;

  useEffect(() => {
    if (editingItem?.configuration) return;
    setGlobalState(buildDefaultSelectionState(globalGroups));
    setUnitStates(buildDefaultUnitStates(unitGroups, config.comboUnitCount || 0));
    setComboStep(0);
  }, [product.id, config.groups, config.comboUnitCount, editingItem?.id, globalGroups, unitGroups]);

  useEffect(() => {
    if (!editingItem?.configuration) return;
    const cfg = editingItem.configuration as CartConfiguration;
    setNote(editingItem.note || "");
    setQuantity(editingItem.quantity);

    const gMap: SelectionState = new Map();
    for (const s of cfg.globalSelections || []) {
      const key = s.groupId;
      const inner = new Map(gMap.get(key) || []);
      inner.set(s.optionId, s.quantity);
      gMap.set(key, inner);
    }
    setGlobalState(gMap);

    if (cfg.comboUnits?.length) {
      setUnitStates(
        cfg.comboUnits.map((u) => {
          const m: SelectionState = new Map();
          for (const s of u.selections) {
            const k = `${s.groupId}::u${u.unitIndex}`;
            const inner = new Map(m.get(k) || []);
            inner.set(s.optionId, s.quantity);
            m.set(k, inner);
          }
          return m;
        }),
      );
    }
  }, [editingItem?.id]);

  const activeGroups = onUnitStep ? unitGroups : globalGroups;
  const activeState = onUnitStep ? unitStates[currentUnitIndex!] || new Map() : globalState;
  const setActiveState = (next: SelectionState) => {
    if (onUnitStep) {
      setUnitStates((prev) => {
        const copy = [...prev];
        copy[currentUnitIndex!] = next;
        return copy;
      });
    } else {
      setGlobalState(next);
    }
  };

  const buildConfiguration = (): CartConfiguration => {
    const globalSelections = buildSelectionsFromState(globalGroups, globalState);
    const comboUnits = isCombo
      ? Array.from({ length: config.comboUnitCount }, (_, i) => ({
          unitIndex: i,
          unitLabel: comboUnitStepTitle(product, i),
          selections: buildSelectionsFromState(
            unitGroups,
            unitStates[i] || new Map(),
            i,
            comboUnitStepTitle(product, i),
          ),
        }))
      : undefined;

    return {
      productType: config.productType,
      globalSelections,
      comboUnits,
    };
  };

  const configuration = buildConfiguration();
  const allSelections = flattenConfiguration(configuration);
  const unitPrice = computeUnitPrice(basePrice, 0, allSelections);

  const validateStep = (): boolean => {
    const groups = activeGroups;
    const state = activeState;
    const idx = onUnitStep ? currentUnitIndex : undefined;
    const result = validateAllGroups(groups, state, idx);
    if (!result.valid) {
      const msg =
        result.error === "required_choice"
          ? t("errRequiredChoice")
          : result.error === "required_substitution"
            ? t("errRequiredSubstitution")
            : result.error === "required_removal"
              ? t("errRequiredRemoval")
              : t("errVerifyChoices");
      toast.error(msg);
      return false;
    }
    return true;
  };

  const validateAll = (): boolean => {
    if (!validateAllGroups(globalGroups, globalState).valid) {
      toast.error(isCombo ? t("errRequiredCombo") : t("errRequiredProduct"));
      setComboStep(0);
      return false;
    }
    if (isCombo) {
      for (let i = 0; i < config.comboUnitCount; i++) {
        if (!validateAllGroups(unitGroups, unitStates[i] || new Map(), i).valid) {
          toast.error(`${t("errRequiredUnit")} ${i + 1}`);
          setComboStep(i + 1);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (comboStep < totalSteps - 1) setComboStep((s) => s + 1);
  };

  const handleAdd = () => {
    if (isCombo && comboStep < totalSteps - 1) {
      handleNext();
      return;
    }
    if (!validateAll()) return;

    const cfg = buildConfiguration();
    const flat = flattenConfiguration(cfg);
    const { extras, removedIngredients } = selectionsToLegacyFields(flat);

    const payload = {
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      basePrice,
      quantity: 1,
      sizeName: null,
      sizeAdd: 0,
      extras,
      removedIngredients,
      note: note.trim() || undefined,
      unitPrice,
      totalPrice: unitPrice,
      selections: flat,
      configuration: cfg,
      productType: config.productType,
    };

    if (editingItem) {
      updateItem(editingItem.id, { ...payload, quantity: editingItem.quantity });
    } else {
      for (let i = 0; i < quantity; i++) addItem(payload);
    }
    onBack();
  };

  const { code: productCode, name: productCleanName } = parseProductCode(tProduct(product.name));

  const stepTitle = onUnitStep
    ? tProduct(comboUnitStepTitle(product, currentUnitIndex!))
    : isCombo
      ? t("comboChoices")
      : tProduct(product.name);

  const stepHeading = onUnitStep ? stepTitle : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background animate-fade-in">
      <ScreenHeader eyebrow={t("menu")} title={productCleanName} onBack={onBack} sticky />

      {isCombo && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= comboStep ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">
            {t("stepOf")} {comboStep + 1} {t("of")} {totalSteps}
            {!onUnitStep && stepTitle ? ` · ${stepTitle}` : ""}
          </p>
          {stepHeading && (
            <h2 className="text-[22px] font-black text-foreground leading-tight mt-2">{stepHeading}</h2>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3 space-y-4 pb-4">
        {comboStep === 0 && (
          <>
            <section className="relative rounded-[28px] overflow-hidden border border-border/70 bg-card shadow-card">
              {productCode && (
                <span className="absolute top-3 right-3 z-10 flex items-center justify-center min-w-[36px] h-[28px] px-2 rounded-full bg-foreground/85 text-background text-xs font-black tabular-nums">
                  {productCode}
                </span>
              )}
              <div className="aspect-[4/3] bg-secondary/40">
                <img src={productImage} alt={productCleanName} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[28px] font-black text-price tabular-nums">{basePrice.toFixed(2)}€</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{tProduct(product.description)}</p>
              </div>
            </section>

            {!isCombo && !editingItem && (
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-foreground">{t("quantity")}</span>
                <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={20} />
              </div>
            )}
          </>
        )}

        {activeGroups.map((group) => (
          <ChoiceGroupSection
            key={`${group.id}-${currentUnitIndex ?? "g"}`}
            group={group}
            state={activeState}
            unitIndex={onUnitStep ? currentUnitIndex : undefined}
            onChange={setActiveState}
            tName={tProduct}
            tDesc={tProduct}
          />
        ))}

        {(comboStep === totalSteps - 1 || !isCombo) && (
          <section className="rounded-[24px] border border-border/70 bg-card p-4 space-y-2 shadow-card">
            <label className="text-sm font-black text-foreground">{t("note")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              rows={2}
              placeholder={t("notePlaceholder")}
              className="w-full rounded-2xl border border-border/70 bg-secondary/30 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </section>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">{t("total")}</span>
          <span className="text-2xl font-black text-price tabular-nums">
            {(unitPrice * (editingItem ? 1 : quantity)).toFixed(2)}€
          </span>
        </div>
        <div className="flex gap-2">
          {isCombo && comboStep > 0 && (
            <button
              type="button"
              onClick={() => setComboStep((s) => s - 1)}
              className="h-14 px-4 rounded-2xl border border-border font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-5 h-5" /> {t("back")}
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black text-base active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {isCombo && comboStep < totalSteps - 1 ? (
              <>
                {t("continueBtn")} <ChevronRight className="w-5 h-5" />
              </>
            ) : editingItem ? (
              t("update")
            ) : (
              t("addToOrder")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
