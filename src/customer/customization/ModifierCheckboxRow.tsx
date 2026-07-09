import { Check, Minus, Plus } from "lucide-react";

type Props = {
  title: string;
  priceLabel?: string | null;
  selected: boolean;
  quantity?: number;
  maxQty?: number;
  showStepper?: boolean;
  emoji?: string | null;
  onClick: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
};

export default function ModifierCheckboxRow({
  title,
  priceLabel,
  selected,
  quantity = 0,
  maxQty = 5,
  showStepper = false,
  emoji,
  onClick,
  onIncrement,
  onDecrement,
}: Props) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all ${
        selected ? "border-primary/70 bg-primary/[0.05]" : "border-border/60 bg-card"
      }`}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]">
        {emoji ? (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-2xl leading-none"
          >
            {emoji}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-foreground">{title}</span>
        {priceLabel && !showStepper && (
          <span className="shrink-0 text-sm font-black tabular-nums text-price">{priceLabel}</span>
        )}
        {!showStepper && (
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
              selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
            }`}
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
        )}
      </button>

      {showStepper && selected && (
        <div className="flex shrink-0 items-center gap-1.5">
          {priceLabel && <span className="mr-1 text-xs font-black tabular-nums text-price">{priceLabel}</span>}
          <button
            type="button"
            aria-label="Menos"
            disabled={quantity <= 0}
            onClick={onDecrement}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-sm font-black tabular-nums">{quantity}</span>
          <button
            type="button"
            aria-label="Mais"
            disabled={quantity >= maxQty}
            onClick={onIncrement}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-success text-success-foreground shadow-sm disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
