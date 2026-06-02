import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import ScreenHeader from "@/components/ScreenHeader";
import ChoiceGroupSection from "@/customer/customization/ChoiceGroupSection";
import ProductSummaryCard from "@/customer/customization/ProductSummaryCard";
import { useCart } from "@/customer/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Category } from "@/data/products";
import type { MenuProduct } from "@/hooks/useMenuData";
import ProductUpsellSheet from "@/customer/customization/ProductUpsellSheet";
import { afterAddSuggestionTitleKey, resolveAfterAddSuggestions } from "@/lib/modifiers/afterAddSuggestions";
import type { ModifierGroup, ProductModifierConfig, SelectionState, CartConfiguration } from "@/lib/modifiers/types";
import { applyComboDescriptionRules } from "@/lib/modifiers/comboConfigFilter";
import { buildSelectionsFromState, validateAllGroups } from "@/lib/modifiers/validation";
import { computeUnitPrice } from "@/lib/modifiers/pricing";
import { configurationSummaryLines, flattenConfiguration, selectionsToLegacyFields } from "@/lib/modifiers/legacyBridge";
import { sortModifierGroups } from "@/lib/modifiers/groupOrder";
import { buildDefaultSelectionState, buildDefaultUnitStates } from "@/lib/modifiers/defaults";
import { parseProductCode } from "@/lib/parseProductCode";
import type { CartItem } from "@/customer/contexts/CartContext";
import { comboUnitStepTitle } from "@/lib/modifiers/comboProductRules";
import { shouldUseCustomizationStepWizard } from "@/lib/modifiers/customizationWizard";

type Props = {
  product: MenuProduct;
  config: ProductModifierConfig;
  menuProducts?: MenuProduct[];
  menuCategories?: Category[];
  editingItem?: CartItem;
  onBack: () => void;
  onFinishAfterAdd?: () => void;
  onOpenProduct?: (productId: string) => void;
};

type WizardStep =
  | { kind: "intro" }
  | { kind: "global"; group: ModifierGroup }
  | { kind: "unit"; unitIndex: number }
  | { kind: "note" }
  | { kind: "summary" };

export default function ProductCustomizationFlow({
  product,
  config,
  menuProducts = [],
  menuCategories = [],
  editingItem,
  onBack,
  onFinishAfterAdd,
  onOpenProduct,
}: Props) {
  const { t, tProduct } = useLanguage();
  const { addItem, updateItem } = useCart();

  const effectiveConfig = useMemo(
    () => applyComboDescriptionRules(product, config, menuProducts) ?? config,
    [product, config, menuProducts],
  );

  const safeGroups = effectiveConfig.groups ?? [];
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

  const isMultiUnit =
    effectiveConfig.productType === "combo" && effectiveConfig.comboUnitCount > 1 && unitGroups.length > 0;

  const useStepWizard = shouldUseCustomizationStepWizard(
    effectiveConfig.productType,
    globalGroups.length,
    isMultiUnit,
  );

  const wizardSteps = useMemo((): WizardStep[] => {
    if (!useStepWizard) return [];
    const steps: WizardStep[] = [{ kind: "intro" }];
    for (const group of globalGroups) steps.push({ kind: "global", group });
    if (isMultiUnit) {
      for (let i = 0; i < effectiveConfig.comboUnitCount; i++) {
        steps.push({ kind: "unit", unitIndex: i });
      }
    }
    steps.push({ kind: "note" }, { kind: "summary" });
    return steps;
  }, [useStepWizard, globalGroups, isMultiUnit, effectiveConfig.comboUnitCount]);

  const [quantity, setQuantity] = useState(1);
  const [globalState, setGlobalState] = useState<SelectionState>(() => new Map());
  const [unitStates, setUnitStates] = useState<SelectionState[]>(() =>
    Array.from({ length: effectiveConfig.comboUnitCount || 0 }, () => new Map()),
  );
  const [comboStep, setComboStep] = useState(0);
  const [note, setNote] = useState("");
  const [upsellOpen, setUpsellOpen] = useState(false);

  const upsellSuggestions = useMemo(
    () =>
      resolveAfterAddSuggestions(product, menuProducts, menuCategories, new Set([product.id])).slice(0, 4),
    [product, menuProducts, menuCategories],
  );
  const upsellTitle = useMemo(() => {
    const key = afterAddSuggestionTitleKey(product, menuCategories);
    return key ? t(key) : t("upsellTitle");
  }, [product, menuCategories, t]);

  const totalSteps = useStepWizard ? wizardSteps.length : 1;
  const currentWizardStep = useStepWizard ? wizardSteps[comboStep] : null;
  const onUnitStep = currentWizardStep?.kind === "unit";
  const currentUnitIndex = onUnitStep ? currentWizardStep.unitIndex : null;
  const isLastStep = comboStep >= totalSteps - 1;

  useEffect(() => {
    if (editingItem?.configuration) return;
    setGlobalState(buildDefaultSelectionState(globalGroups));
    setUnitStates(buildDefaultUnitStates(unitGroups, effectiveConfig.comboUnitCount || 0));
    setComboStep(0);
  }, [product.id, effectiveConfig.groups, effectiveConfig.comboUnitCount, editingItem?.id, globalGroups, unitGroups]);

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

  const activeGroups = useStepWizard
    ? currentWizardStep?.kind === "global"
      ? [currentWizardStep.group]
      : onUnitStep
        ? unitGroups
        : []
    : onUnitStep
      ? unitGroups
      : globalGroups;

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
    const comboUnits = isMultiUnit
      ? Array.from({ length: effectiveConfig.comboUnitCount }, (_, i) => ({
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
      productType: effectiveConfig.productType,
      globalSelections,
      comboUnits,
    };
  };

  const configuration = buildConfiguration();
  const allSelections = flattenConfiguration(configuration);
  const unitPrice = computeUnitPrice(basePrice, 0, allSelections);

  const validateCurrentStep = (): boolean => {
    if (
      currentWizardStep?.kind === "intro" ||
      currentWizardStep?.kind === "note" ||
      currentWizardStep?.kind === "summary"
    ) {
      return true;
    }

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
      toast.error(isMultiUnit ? t("errRequiredCombo") : t("errRequiredProduct"));
      setComboStep(useStepWizard ? 1 : 0);
      return false;
    }
    if (isMultiUnit) {
      for (let i = 0; i < effectiveConfig.comboUnitCount; i++) {
        if (!validateAllGroups(unitGroups, unitStates[i] || new Map(), i).valid) {
          toast.error(`${t("errRequiredUnit")} ${i + 1}`);
          const unitStepIndex = wizardSteps.findIndex(
            (s) => s.kind === "unit" && s.unitIndex === i,
          );
          if (unitStepIndex >= 0) setComboStep(unitStepIndex);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (comboStep < totalSteps - 1) setComboStep((s) => s + 1);
  };

  const finishFlow = onFinishAfterAdd ?? onBack;

  const handleAdd = () => {
    if (useStepWizard && !isLastStep) {
      handleNext();
      return;
    }
    if (!validateAll()) return;

    try {
      const cfg = buildConfiguration();
      const flat = flattenConfiguration(cfg);
      const { extras, removedIngredients } = selectionsToLegacyFields(flat);
      const orderQty = editingItem ? editingItem.quantity : quantity;

      const payload = {
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        basePrice,
        quantity: orderQty,
        sizeName: null,
        sizeAdd: 0,
        extras,
        removedIngredients,
        note: note.trim() || undefined,
        unitPrice,
        totalPrice: unitPrice * orderQty,
        selections: flat,
        configuration: cfg,
        productType: effectiveConfig.productType,
      };

      if (editingItem) {
        updateItem(editingItem.id, { ...payload, quantity: editingItem.quantity, totalPrice: unitPrice * editingItem.quantity });
        onBack();
        return;
      }

      addItem(payload);

      if (upsellSuggestions.length > 0) {
        setUpsellOpen(true);
        return;
      }
      finishFlow();
    } catch (err) {
      console.error("[ProductCustomizationFlow] add to cart failed", err);
      toast.error(t("errVerifyChoices"));
    }
  };

  const { code: productCode, name: productCleanName } = parseProductCode(tProduct(product.name));

  const stepTitle = (() => {
    if (!currentWizardStep) return tProduct(product.name);
    if (currentWizardStep.kind === "intro") return tProduct(product.name);
    if (currentWizardStep.kind === "note") return t("note");
    if (currentWizardStep.kind === "summary") return t("customizationSummary");
    if (currentWizardStep.kind === "global") return tProduct(currentWizardStep.group.name);
    return tProduct(comboUnitStepTitle(product, currentWizardStep.unitIndex));
  })();

  const stepHint = (() => {
    if (currentWizardStep?.kind === "summary") return t("customizationSummaryHint");
    if (currentWizardStep?.kind === "note") return null;
    if (currentWizardStep?.kind === "global") {
      const g = currentWizardStep.group;
      if (g.groupKind === "substitution") return t("potatoStepHint");
      if (/bebida|refresco|drink/i.test(`${g.name.es} ${g.name.pt}`)) return t("chooseOne");
      return g.isRequired ? t("chooseOne") : null;
    }
    if (onUnitStep) return t("chooseOne");
    return null;
  })();

  const showIntro = !useStepWizard || currentWizardStep?.kind === "intro";
  const showNote = !useStepWizard || currentWizardStep?.kind === "note";
  const showSummary = useStepWizard && currentWizardStep?.kind === "summary";

  const summaryLines = useMemo(
    () => configurationSummaryLines(configuration, tProduct, t("without")),
    [configuration, tProduct, t],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-secondary/15 animate-fade-in">
      <ScreenHeader eyebrow={t("customizeProduct")} title={productCleanName} onBack={onBack} sticky />

      {useStepWizard && (
        <div className="shrink-0 px-4 pt-2 pb-1">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= comboStep ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("stepOf")} {comboStep + 1} {t("of")} {totalSteps}
          </p>
          {currentWizardStep?.kind !== "intro" && (
            <>
              <h2 className="mt-2 text-[20px] font-black leading-tight text-foreground">{stepTitle}</h2>
              {stepHint && <p className="mt-1 text-sm text-muted-foreground">{stepHint}</p>}
            </>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3 space-y-3.5 pb-4">
        {showIntro && (
          <ProductSummaryCard
            imageUrl={productImage}
            name={productCleanName}
            priceLabel={`${basePrice.toFixed(2)}€`}
            productCode={productCode}
            quantity={quantity}
            onQuantityChange={setQuantity}
            showQuantity={!editingItem && (!useStepWizard || currentWizardStep?.kind === "intro")}
          />
        )}

        {showIntro && tProduct(product.description) && (
          <p className="px-1 text-sm leading-relaxed text-muted-foreground">{tProduct(product.description)}</p>
        )}

        {activeGroups.map((group) => (
          <ChoiceGroupSection
            key={`${group.id}-${currentUnitIndex ?? "g"}-${comboStep}`}
            group={group}
            state={activeState}
            unitIndex={onUnitStep ? currentUnitIndex : undefined}
            onChange={setActiveState}
            tName={tProduct}
            tDesc={tProduct}
            hideHeader={onUnitStep && group.repeatPerUnit}
            stepMode={useStepWizard && currentWizardStep?.kind === "global"}
          />
        ))}

        {showNote && (
          <section className="space-y-2 rounded-[22px] border border-border/50 bg-card p-4 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.2)]">
            <label className="text-sm font-black text-foreground">{t("note")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              rows={3}
              placeholder={t("notePlaceholder")}
              className="w-full resize-none rounded-2xl border border-border/60 bg-secondary/25 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </section>
        )}

        {showSummary && (
          <>
            <ProductSummaryCard
              imageUrl={productImage}
              name={productCleanName}
              priceLabel={`${unitPrice.toFixed(2)}€`}
              productCode={productCode}
              quantity={quantity}
              onQuantityChange={setQuantity}
              showQuantity={!editingItem}
            />
            {summaryLines.length > 0 && (
              <section className="space-y-2 rounded-[22px] border border-border/50 bg-card p-4 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.2)]">
                <h3 className="text-sm font-black text-foreground">{t("customizationSummary")}</h3>
                <ul className="space-y-1 text-sm text-foreground/90">
                  {summaryLines.map((line) => (
                    <li key={line} className="leading-snug">
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {note.trim() && (
              <section className="rounded-[22px] border border-border/50 bg-card p-4 text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{t("note")}: </span>
                {note.trim()}
              </section>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 pt-3 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          {useStepWizard && comboStep > 0 && (
            <button
              type="button"
              onClick={() => setComboStep((s) => s - 1)}
              className="flex h-14 items-center gap-1 rounded-2xl border border-border px-4 font-bold"
            >
              <ChevronLeft className="h-5 w-5" /> {t("back")}
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-14 flex-1 items-center justify-between gap-3 rounded-[18px] bg-gradient-primary px-5 text-primary-foreground shadow-primary transition-transform active:scale-[0.98]"
          >
            <span className="text-[13px] font-black uppercase tracking-[0.08em]">
              {useStepWizard && !isLastStep
                ? t("continueBtn")
                : editingItem
                  ? t("update")
                  : t("addToCartBtn")}
            </span>
            <span className="text-lg font-black tabular-nums">
              {(unitPrice * (editingItem ? 1 : quantity)).toFixed(2)}€
            </span>
          </button>
        </div>
        {!useStepWizard || isLastStep ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3 opacity-70" />
            {t("securePaymentHint")}
          </p>
        ) : null}
      </div>

      {upsellOpen && (
        <ProductUpsellSheet
          title={upsellTitle}
          suggestions={upsellSuggestions}
          menuProducts={menuProducts}
          onPick={(id) => {
            setUpsellOpen(false);
            if (onOpenProduct) onOpenProduct(id);
            else onBack();
          }}
          onSkip={() => {
            setUpsellOpen(false);
            finishFlow();
          }}
        />
      )}
    </div>
  );
}
