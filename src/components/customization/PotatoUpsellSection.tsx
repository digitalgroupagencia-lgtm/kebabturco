import { useLanguage } from "@/contexts/LanguageContext";
import type { ModifierGroup, SelectionState } from "@/lib/modifiers/types";
import { getGroupSelectionCount, groupKey } from "@/lib/modifiers/validation";
import ProductChoiceCard from "@/components/customization/ProductChoiceCard";

type Props = {
  group: ModifierGroup;
  state: SelectionState;
  unitIndex?: number | null;
  onChange: (next: SelectionState) => void;
  tName: (n: Record<string, string>) => string;
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

export default function PotatoUpsellSection({ group, state, unitIndex, onChange, tName }: Props) {
  const { t } = useLanguage();
  const count = getGroupSelectionCount(state, group.id, unitIndex);
  const key = groupKey(group.id, unitIndex);
  const selected = state.get(key) || new Map();

  const included = group.options.filter((o) => o.priceDelta === 0);
  const upgrades = group.options.filter((o) => o.priceDelta > 0);

  const pick = (optionId: string) => {
    onChange(pickSingleOption(state, group, optionId, unitIndex));
  };

  return (
    <section className="rounded-[24px] border border-border/70 bg-card shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 bg-secondary/30 flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-black text-foreground leading-tight">{tName(group.name)}</h3>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            group.isRequired && count === 0
              ? "bg-red-500/10 text-red-600"
              : count > 0
                ? "bg-emerald-500/15 text-emerald-700"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {group.isRequired && count === 0 ? t("missingChoice") : t("required")}
        </span>
      </div>

      <div className="p-4 space-y-4">
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
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              {t("potatoUpsellTitle")}
            </p>
            <div className={`grid gap-3 ${upgrades.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
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
