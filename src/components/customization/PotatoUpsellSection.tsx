import { Check, Sparkles } from "lucide-react";
import type { ModifierGroup, SelectionState } from "@/lib/modifiers/types";
import { getGroupSelectionCount, groupKey } from "@/lib/modifiers/validation";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  group: ModifierGroup;
  state: SelectionState;
  unitIndex?: number | null;
  onChange: (next: SelectionState) => void;
  tName: (n: Record<string, string>) => string;
};

const SELECTED = "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/25";
const UPGRADE_SELECTED = "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30";

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
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt.id)}
              className={`w-full rounded-[20px] border px-4 py-4 text-left transition-all active:scale-[0.99] flex items-center gap-4 ${
                sel ? SELECTED : "border-border/70 bg-background"
              }`}
            >
              <span className="text-3xl shrink-0" aria-hidden>
                🍟
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-foreground leading-tight">{tName(opt.name)}</p>
                <p className="text-xs text-emerald-700 font-semibold mt-1">{t("included")}</p>
              </div>
              {sel && (
                <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}

        {upgrades.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t("potatoUpsellTitle")}
            </p>
            <div className={`grid gap-2 ${upgrades.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {upgrades.map((opt) => {
                const sel = (selected.get(opt.id) || 0) > 0;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pick(opt.id)}
                    className={`relative rounded-[20px] border px-3 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] min-h-[88px] ${
                      sel ? UPGRADE_SELECTED : "border-amber-500/40 bg-amber-500/5"
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>
                      ✨
                    </span>
                    <span className="text-sm font-black text-center leading-tight">{tName(opt.name)}</span>
                    <span className="text-xs font-black text-amber-700 tabular-nums">
                      +{opt.priceDelta.toFixed(2)}€
                    </span>
                    {sel && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
