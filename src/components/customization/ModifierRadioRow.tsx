import { Check } from "lucide-react";

type Props = {
  title: string;
  priceLabel?: string | null;
  selected: boolean;
  onClick: () => void;
};

export default function ModifierRadioRow({ title, priceLabel, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
        selected ? "border-primary bg-primary/[0.06] shadow-primary" : "border-border/60 bg-card"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
        }`}
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className={`flex-1 text-[15px] font-bold leading-tight ${selected ? "text-foreground" : "text-foreground/90"}`}>
        {title}
      </span>
      {priceLabel && (
        <span className="shrink-0 text-sm font-black tabular-nums text-price">{priceLabel}</span>
      )}
    </button>
  );
}
