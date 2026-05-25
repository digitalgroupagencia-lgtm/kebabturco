import { Check, Minus, Plus } from "lucide-react";
import type { ModifierGroup, SelectionState } from "@/lib/modifiers/types";
import { getGroupSelectionCount } from "@/lib/modifiers/validation";

type Props = {
  group: ModifierGroup;
  state: SelectionState;
  unitIndex?: number | null;
  onChange: (next: SelectionState) => void;
  tName: (n: Record<string, string>) => string;
  tDesc?: (n: Record<string, string>) => string;
};

function groupKey(groupId: string, unitIndex?: number | null) {
  return unitIndex != null ? `${groupId}::u${unitIndex}` : groupId;
}

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

  if (group.selectionMode === "single" && qty > 0) {
    for (const id of map.keys()) {
      if (id !== optionId) map.delete(id);
    }
  }

  next.set(key, map);
  return next;
}

const badgeLabel = (group: ModifierGroup) => {
  if (group.isRequired) return "Obrigatório";
  if (group.groupKind === "extra") return "Extra";
  if (group.groupKind === "removal") return "Personalizar";
  return "Opcional";
};

export default function ChoiceGroupSection({ group, state, unitIndex, onChange, tName, tDesc }: Props) {
  const count = getGroupSelectionCount(state, group.id, unitIndex);
  const isRemoval = group.groupKind === "removal";
  const isExtra = group.groupKind === "extra";
  const key = groupKey(group.id, unitIndex);
  const selected = state.get(key) || new Map();

  const subtitle = group.description && tDesc ? tDesc(group.description) : null;
  const maxHint =
    group.selectionMode === "multiple" && group.maxSelect > 1
      ? `Escolhe até ${group.maxSelect}`
      : group.isRequired
        ? "Escolhe 1"
        : null;

  return (
    <section className="rounded-[24px] border border-border/70 bg-card shadow-card overflow-hidden">
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
                : "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {group.isRequired && count === 0 ? "Falta escolher" : badgeLabel(group)}
        </span>
      </div>

      <div className="p-3 space-y-2">
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
                    removed
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border/70 bg-background"
                  }`}
                >
                  <span
                    className={`block text-sm font-bold leading-tight ${
                      removed ? "line-through text-destructive/80" : "text-foreground"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {removed ? "Removido" : "Incluído"}
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
                    className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className={`grid gap-2 ${
              group.options.length >= 4 ? "grid-cols-2" : group.options.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {group.options.map((opt) => {
              const qty = selected.get(opt.id) || 0;
              const sel = qty > 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (group.selectionMode === "single") {
                      onChange(updateOption(state, group, opt.id, sel ? 0 : 1, unitIndex));
                    } else {
                      const nextQty = sel ? 0 : 1;
                      onChange(updateOption(state, group, opt.id, nextQty, unitIndex));
                    }
                  }}
                  className={`relative rounded-2xl border px-2 py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] min-h-[56px] ${
                    sel ? "border-primary bg-primary/10 ring-2 ring-primary/25" : "border-border/70 bg-background"
                  }`}
                >
                  {sel && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                  <span className="text-sm font-black text-center leading-tight">{tName(opt.name)}</span>
                  {opt.priceDelta > 0 && (
                    <span className="text-[11px] font-bold text-price tabular-nums">+{opt.priceDelta.toFixed(2)}€</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export { updateOption, groupKey };
