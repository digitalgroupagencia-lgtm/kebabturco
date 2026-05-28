interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  variant?: "default" | "compact" | "premium";
}

const QuantitySelector = ({ value, onChange, min = 0, max = 20, variant = "default" }: Props) => {
  const isCompact = variant === "compact";
  const isPremium = variant === "premium";

  if (isPremium) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-secondary/30 p-1">
        <button
          type="button"
          onClick={() => value > min && onChange(value - 1)}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-lg font-black text-muted-foreground transition-transform active:scale-90 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-7 text-center text-base font-black tabular-nums text-foreground">{value}</span>
        <button
          type="button"
          onClick={() => value < max && onChange(value + 1)}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-lg font-black text-success-foreground shadow-sm transition-transform active:scale-90 disabled:opacity-30"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${isCompact ? "gap-2 rounded-full bg-secondary/50 border border-border px-1.5 py-1" : "gap-3"}`}>
      <button
        onClick={() => value > min && onChange(value - 1)}
        className={`flex items-center justify-center active:scale-90 transition-transform touch-action-manipulation disabled:opacity-30 ${
          isCompact
            ? value > 1
              ? "w-9 h-9 rounded-full bg-destructive text-destructive-foreground text-xl font-bold"
              : "w-9 h-9 rounded-full bg-background text-muted-foreground text-xl font-bold border border-border"
            : value > 1
              ? "w-10 h-10 rounded-full bg-destructive text-destructive-foreground text-xl font-bold"
              : "w-10 h-10 rounded-full bg-secondary text-foreground text-xl font-bold"
        }`}
        disabled={value <= min}
      >
        −
      </button>
      <span className={`${isCompact ? "text-base w-7" : "text-lg w-6"} font-black text-center text-foreground tabular-nums`}>
        {value}
      </span>
      <button
        onClick={() => value < max && onChange(value + 1)}
        className={`flex items-center justify-center active:scale-90 transition-transform touch-action-manipulation disabled:opacity-30 ${
          isCompact
            ? "w-9 h-9 rounded-full bg-success text-success-foreground text-xl font-bold shadow-sm"
            : "w-10 h-10 rounded-full bg-success text-success-foreground text-xl font-bold"
        }`}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
};

export default QuantitySelector;
