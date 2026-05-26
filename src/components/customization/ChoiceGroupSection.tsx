import { Minus, Plus } from "lucide-react";
import type { ModifierGroup, SelectionState } from "@/lib/modifiers/types";
import { getGroupSelectionCount, groupKey } from "@/lib/modifiers/validation";
import { useLanguage } from "@/contexts/LanguageContext";
import PotatoUpsellSection from "@/components/customization/PotatoUpsellSection";
import ProductChoiceCard from "@/components/customization/ProductChoiceCard";

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

const INCLUDED = "border-emerald-500/50 bg-emerald-500/10 text-emerald-900";
const REMOVED = "border-red-500 bg-red-500/10";

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
    if (group.isRequired && !isRemoval) return t("required");
    if (isRemoval) return t("customize");
    if (isExtra) return t("extraTag");
    return t("optional");
  };

  const subtitle = group.description && tDesc ? tDesc(group.description) : null;
  const maxHint = group.groupKind === "substitution"
    ? t("substitutionHint")
    : group.selectionMode === "multiple" && group.maxSelect > 1
      ? `${t("chooseUpTo")} ${group.maxSelect}`
      : group.isRequired && isSingle
        ? t("chooseOne")
        : null;

  return (
    <section
      className={`overflow-hidden ${stepMode ? "" : "rounded-[24px] border border-border/70 bg-card shadow-card"}`}
    >
      {!hideHeader && !stepMode && (
        <div className="px-4 py-3.5 border-b border-border/60 bg-secondary/30 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[17px] font-black text-foreground leading-tight">{tName(group.name)}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {maxHint && <p className="text-[11px] text-muted-foreground mt-1 font-semibold">{maxHint}</p>}
          </div>
          <span
            className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              group.isRequired
                ? count > 0
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-red-500/10 text-red-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {group.isRequired && count === 0 ? t("missingChoice") : badgeLabel()}
          </span>
        </div>
      )}

      {hideHeader && group.isRequired && (
        <div className="px-4 pt-3 flex justify-end">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              count > 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/10 text-red-600"
            }`}
          >
            {count === 0 ? t("missingChoice") : t("required")}
          </span>
        </div>
      )}

      <div className={`space-y-2 ${stepMode ? "" : "p-3"} ${hideHeader ? "pt-1" : ""}`}>
        {isRemoval ? (
          <div className="grid grid-cols-2 gap-2">
            {group.options.map((opt) => {
              const removed = (selected.get(opt.id) || 0) > 0;
              const label = tName(opt.name);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChange(updateOption(state, group, opt.id, removed ? 0 : 1, unitIndex))
                  }
                  className={`rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98] min-h-[52px] ${
                    removed ? REMOVED : INCLUDED
                  }`}
                >
                  <span
                    className={`block text-sm font-bold leading-tight ${
                      removed ? "line-through text-red-700" : "text-emerald-900"
                    }`}
                  >
                    {label}
                  </span>
                  <span className={`text-[10px] mt-1 block ${removed ? "text-red-600" : "text-emerald-700"}`}>
                    {removed ? t("removedLabel") : t("included")}
                  </span>
                </button>
              );
            })}
          </div>
        ) : isExtra ? (
          group.options.map((opt) => {
            const qty = selected.get(opt.id) || 0;
            const max = opt.maxQty || 5;
            return (
              <div
                key={opt.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{tName(opt.name)}</p>
                  {opt.priceDelta > 0 && (
                    <p className="text-xs font-black text-price tabular-nums">+{opt.priceDelta.toFixed(2)}€</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Menos"
                    disabled={qty <= 0}
                    onClick={() => onChange(updateOption(state, group, opt.id, Math.max(0, qty - 1), unitIndex))}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-black tabular-nums">{qty}</span>
                  <button
                    type="button"
                    aria-label="Mais"
                    disabled={qty >= max}
                    onClick={() => onChange(updateOption(state, group, opt.id, Math.min(max, qty + 1), unitIndex))}
                    className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={`grid gap-2 ${choiceGridCols(group.options.length)}`}>
            {group.options.map((opt) => {
              const qty = selected.get(opt.id) || 0;
              const sel = qty > 0;
              const compact = group.options.length >= 3;
              return (
                <ProductChoiceCard
                  key={opt.id}
                  title={tName(opt.name)}
                  priceLabel={opt.priceDelta > 0 ? `+${opt.priceDelta.toFixed(2)}€` : null}
                  imageUrl={opt.imageUrl}
                  selected={sel}
                  compact={compact}
                  onClick={() => {
                    if (isSingle) {
                      if (sel && group.isRequired) return;
                      onChange(updateOption(state, group, opt.id, sel && !group.isRequired ? 0 : 1, unitIndex));
                    } else {
                      onChange(updateOption(state, group, opt.id, sel ? 0 : 1, unitIndex));
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export { updateOption, groupKey };
