import { useLanguage } from "@/contexts/LanguageContext";
import type { ModifierGroup, SelectionState } from "@/lib/modifiers/types";
import { getGroupSelectionCount, groupKey } from "@/lib/modifiers/validation";
import ProductChoiceCard from "@/customer/customization/ProductChoiceCard";
import ModifierGroupHeader from "@/customer/customization/ModifierGroupHeader";
import { resolveModifierOptionImage } from "@/lib/modifiers/optionImageResolver";
import type { MenuProduct } from "@/hooks/useMenuData";

type Props = {
  group: ModifierGroup;
  state: SelectionState;
  unitIndex?: number | null;
  onChange: (next: SelectionState) => void;
  tName: (n: Record<string, string>) => string;
  stepMode?: boolean;
  menuProducts?: MenuProduct[];
};

function pickSingleOption(
  state: SelectionState,
  group: ModifierGroup,
  optionId: string,
  unitIndex?: number | null,
): SelectionState {
  const key = groupKey(group.id, unitIndex);
  const next = new Map(state);
  next.set(key, new Map([[optionId, 1]]));
  return next;
}

export default function PotatoUpsellSection({ group, state, unitIndex, onChange, tName, stepMode }: Props) {
  const { t } = useLanguage();
  const count = getGroupSelectionCount(state, group.id, unitIndex);
  const key = groupKey(group.id, unitIndex);
  const selected = state.get(key) || new Map();

  const included = group.options.filter((o) => o.priceDelta === 0);
  const upgrades = group.options.filter((o) => o.priceDelta > 0);

  const pick = (optionId: string) => {
    onChange(pickSingleOption(state, group, optionId, unitIndex));
  };

  const upgradeCols = upgrades.length >= 3 ? "grid-cols-3" : upgrades.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <section
      className={
        stepMode
          ? "space-y-4"
          : "overflow-hidden rounded-[22px] border border-border/50 bg-card shadow-[0_8px_24px_-18px_rgba(0,0,0,0.22)]"
      }
    >
      {!stepMode && (
        <ModifierGroupHeader
          group={group}
          title={tName(group.name)}
          subtitle={t("substitutionHint")}
          badge={group.isRequired ? t("required") : t("optional")}
          badgeTone={group.isRequired && count === 0 ? "required" : count > 0 ? "done" : "optional"}
        />
      )}

      <div className={stepMode ? "space-y-4" : "space-y-4 p-3.5"}>
        {included.map((opt) => {
          const sel = (selected.get(opt.id) || 0) > 0;
          return (
            <ProductChoiceCard
              key={opt.id}
              title={tName(opt.name)}
              subtitle={t("included")}
              imageUrl={opt.imageUrl}
              selected={sel}
              onClick={() => pick(opt.id)}
              layout="horizontal"
            />
          );
        })}

        {upgrades.length > 0 && (
          <div className="space-y-3">
            <p className="px-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("potatoUpsellTitle")}
            </p>
            <div className={`grid gap-2.5 ${upgradeCols}`}>
              {upgrades.map((opt) => {
                const sel = (selected.get(opt.id) || 0) > 0;
                return (
                  <ProductChoiceCard
                    key={opt.id}
                    title={tName(opt.name)}
                    priceLabel={`+${opt.priceDelta.toFixed(2)}€`}
                    subtitle={t("potatoUpgradeHint")}
                    imageUrl={opt.imageUrl}
                    selected={sel}
                    onClick={() => pick(opt.id)}
                    layout="vertical"
                    compact={upgrades.length >= 3}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
