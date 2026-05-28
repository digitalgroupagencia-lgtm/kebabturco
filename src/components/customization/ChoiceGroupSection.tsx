import { Minus, Plus } from "lucide-react";
import type { ModifierGroup, SelectionState } from "@/lib/modifiers/types";
import { getGroupSelectionCount, groupKey } from "@/lib/modifiers/validation";
import { useLanguage } from "@/contexts/LanguageContext";
import PotatoUpsellSection from "@/components/customization/PotatoUpsellSection";
import ProductChoiceCard from "@/components/customization/ProductChoiceCard";
import InfoChoiceRow from "@/components/customization/InfoChoiceRow";
import ModifierGroupHeader from "@/components/customization/ModifierGroupHeader";
import ModifierRadioRow from "@/components/customization/ModifierRadioRow";
import ModifierCheckboxRow from "@/components/customization/ModifierCheckboxRow";
import ModifierChipOption from "@/components/customization/ModifierChipOption";
import { isInformationalModifierGroup } from "@/lib/modifiers/informationalGroups";
import {
  groupHasImages,
  shouldUseChipLayout,
  shouldUseImageCarousel,
  shouldUseRadioList,
} from "@/lib/modifiers/groupRenderStyle";

type Props = {
  group: ModifierGroup;
  state: SelectionState;
  unitIndex?: number | null;
  onChange: (next: SelectionState) => void;
  tName: (n: Record<string, string>) => string;
  tDesc?: (n: Record<string, string>) => string;
  hideHeader?: boolean;
  stepMode?: boolean;
};

const INCLUDED = "border-emerald-500/45 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100";
const REMOVED = "border-red-500/70 bg-red-500/10";

function updateOption(
  state: SelectionState,
  group: ModifierGroup,
  optionId: string,
  qty: number,
  unitIndex?: number | null,
): SelectionState {
  const key = groupKey(group.id, unitIndex);
  const next = new Map(state);
  const map = new Map(next.get(key) || []);

  if (qty <= 0) map.delete(optionId);
  else map.set(optionId, qty);

  const singleOnly = group.groupKind === "substitution" || group.selectionMode === "single";
  if (singleOnly && qty > 0) {
    for (const id of map.keys()) {
      if (id !== optionId) map.delete(id);
    }
  }

  next.set(key, map);
  return next;
}

function choiceGridCols(count: number): string {
  if (count >= 3) return "grid-cols-3";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-1";
}

export default function ChoiceGroupSection({
  group,
  state,
  unitIndex,
  onChange,
  tName,
  tDesc,
  hideHeader,
  stepMode,
}: Props) {
  const { t } = useLanguage();
  const count = getGroupSelectionCount(state, group.id, unitIndex);
  const isRemoval = group.groupKind === "removal";
  const isExtra = group.groupKind === "extra";
  const isSubstitution = group.groupKind === "substitution";
  const isInformational = isInformationalModifierGroup(group);
  const isSingle = isSubstitution || group.selectionMode === "single";
  const key = groupKey(group.id, unitIndex);
  const selected = state.get(key) || new Map();

  if (isSubstitution && !hideHeader) {
    return (
      <PotatoUpsellSection
        group={group}
        state={state}
        unitIndex={unitIndex}
        onChange={onChange}
        tName={tName}
        stepMode={stepMode}
      />
    );
  }

  const badgeLabel = () => {
    if (group.isRequired && !isRemoval) return count > 0 ? t("required") : t("required");
    if (isRemoval) return t("customize");
    if (isExtra) return t("optional");
    return t("optional");
  };

  const badgeTone = (): "required" | "optional" | "limit" | "done" => {
    if (group.isRequired && count === 0) return "required";
    if (group.isRequired && count > 0) return "done";
    if (group.selectionMode === "multiple" && group.maxSelect > 1) return "limit";
    return "optional";
  };

  const subtitle = group.description && tDesc ? tDesc(group.description) : null;
  const maxHint =
    group.selectionMode === "multiple" && group.maxSelect > 1
      ? `${t("chooseUpTo")} ${group.maxSelect}`
      : group.isRequired && isSingle
        ? t("chooseOne")
        : null;

  const cardShell = stepMode ? "space-y-3" : "overflow-hidden rounded-[22px] border border-border/50 bg-card shadow-[0_8px_24px_-18px_rgba(0,0,0,0.22)]";

  const toggleSingle = (optionId: string, sel: boolean) => {
    if (isSingle) {
      if (sel && group.isRequired) return;
      onChange(updateOption(state, group, optionId, sel && !group.isRequired ? 0 : 1, unitIndex));
    } else {
      onChange(updateOption(state, group, optionId, sel ? 0 : 1, unitIndex));
    }
  };

  const renderOptions = () => {
    if (isRemoval) {
      return (
        <div className="flex flex-wrap gap-2">
          {group.options.map((opt) => {
            const removed = (selected.get(opt.id) || 0) > 0;
            const label = tName(opt.name);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(updateOption(state, group, opt.id, removed ? 0 : 1, unitIndex))}
                className={`rounded-full border px-4 py-2.5 text-left transition-all active:scale-[0.97] ${
                  removed ? REMOVED : INCLUDED
                }`}
              >
                <span className={`block text-sm font-bold leading-tight ${removed ? "line-through text-red-700" : ""}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    if (isExtra) {
      return (
        <div className="space-y-2">
          {group.options.map((opt) => {
            const qty = selected.get(opt.id) || 0;
            const max = opt.maxQty || 5;
            const sel = qty > 0;
            const useStepper = max > 1;

            if (useStepper) {
              return (
                <ModifierCheckboxRow
                  key={opt.id}
                  title={tName(opt.name)}
                  priceLabel={opt.priceDelta > 0 ? `+${opt.priceDelta.toFixed(2)}€` : null}
                  selected={sel}
                  quantity={qty}
                  maxQty={max}
                  showStepper
                  onClick={() =>
                    onChange(updateOption(state, group, opt.id, sel ? 0 : 1, unitIndex))
                  }
                  onDecrement={() =>
                    onChange(updateOption(state, group, opt.id, Math.max(0, qty - 1), unitIndex))
                  }
                  onIncrement={() =>
                    onChange(updateOption(state, group, opt.id, Math.min(max, qty + 1), unitIndex))
                  }
                />
              );
            }

            return (
              <ModifierCheckboxRow
                key={opt.id}
                title={tName(opt.name)}
                priceLabel={opt.priceDelta > 0 ? `+${opt.priceDelta.toFixed(2)}€` : null}
                selected={sel}
                onClick={() => onChange(updateOption(state, group, opt.id, sel ? 0 : 1, unitIndex))}
              />
            );
          })}
        </div>
      );
    }

    if (isInformational) {
      return (
        <div className="space-y-2">
          {group.options.map((opt) => {
            const qty = selected.get(opt.id) || 0;
            const sel = qty > 0;
            return (
              <InfoChoiceRow
                key={opt.id}
                title={tName(opt.name)}
                selected={sel}
                onClick={() => toggleSingle(opt.id, sel)}
              />
            );
          })}
        </div>
      );
    }

    if (shouldUseImageCarousel(group)) {
      return (
        <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 no-scrollbar snap-x snap-mandatory">
          {group.options.map((opt) => {
            const sel = (selected.get(opt.id) || 0) > 0;
            return (
              <div key={opt.id} className="w-[108px] shrink-0 snap-start">
                <ProductChoiceCard
                  title={tName(opt.name)}
                  priceLabel={opt.priceDelta > 0 ? `${opt.priceDelta.toFixed(2)}€` : null}
                  imageUrl={opt.imageUrl}
                  selected={sel}
                  compact
                  onClick={() => toggleSingle(opt.id, sel)}
                />
              </div>
            );
          })}
        </div>
      );
    }

    if (shouldUseChipLayout(group)) {
      return (
        <div className="flex flex-wrap gap-2">
          {group.options.map((opt) => {
            const sel = (selected.get(opt.id) || 0) > 0;
            return (
              <ModifierChipOption
                key={opt.id}
                title={tName(opt.name)}
                selected={sel}
                onClick={() => toggleSingle(opt.id, sel)}
              />
            );
          })}
        </div>
      );
    }

    if (shouldUseRadioList(group) && !groupHasImages(group)) {
      return (
        <div className="space-y-2">
          {group.options.map((opt) => {
            const sel = (selected.get(opt.id) || 0) > 0;
            return (
              <ModifierRadioRow
                key={opt.id}
                title={tName(opt.name)}
                priceLabel={opt.priceDelta > 0 ? `+${opt.priceDelta.toFixed(2)}€` : null}
                selected={sel}
                onClick={() => toggleSingle(opt.id, sel)}
              />
            );
          })}
        </div>
      );
    }

    if (group.selectionMode === "multiple" && !groupHasImages(group)) {
      return (
        <div className="space-y-2">
          {group.options.map((opt) => {
            const sel = (selected.get(opt.id) || 0) > 0;
            return (
              <ModifierCheckboxRow
                key={opt.id}
                title={tName(opt.name)}
                priceLabel={opt.priceDelta > 0 ? `+${opt.priceDelta.toFixed(2)}€` : null}
                selected={sel}
                onClick={() => toggleSingle(opt.id, sel)}
              />
            );
          })}
        </div>
      );
    }

    return (
      <div className={`grid gap-2.5 ${choiceGridCols(group.options.length)}`}>
        {group.options.map((opt) => {
          const sel = (selected.get(opt.id) || 0) > 0;
          const compact = group.options.length >= 3;
          return (
            <ProductChoiceCard
              key={opt.id}
              title={tName(opt.name)}
              priceLabel={opt.priceDelta > 0 ? `+${opt.priceDelta.toFixed(2)}€` : null}
              imageUrl={opt.imageUrl}
              selected={sel}
              compact={compact}
              onClick={() => toggleSingle(opt.id, sel)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className={cardShell}>
      {!hideHeader && !stepMode && (
        <ModifierGroupHeader
          group={group}
          title={tName(group.name)}
          subtitle={subtitle || maxHint}
          badge={
            group.isRequired && count === 0
              ? t("required")
              : group.selectionMode === "multiple" && group.maxSelect > 1
                ? `${t("chooseUpTo")} ${group.maxSelect}`
                : badgeLabel()
          }
          badgeTone={badgeTone()}
        />
      )}

      {hideHeader && group.isRequired && (
        <div className="flex justify-end px-4 pt-3">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              count > 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-primary/25 bg-primary/8 text-primary"
            }`}
          >
            {count === 0 ? t("missingChoice") : t("required")}
          </span>
        </div>
      )}

      <div className={`${stepMode ? "" : "p-3.5"} ${hideHeader ? "pt-1" : ""}`}>{renderOptions()}</div>
    </section>
  );
}

export { updateOption, groupKey };
