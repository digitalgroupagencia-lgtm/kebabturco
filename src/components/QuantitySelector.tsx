interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  variant?: "default" | "compact";
}

const QuantitySelector = ({ value, onChange, min = 0, max = 20, variant = "default" }: Props) => {
  const isCompact = variant === "compact";

  return (
    <div className={`flex items-center ${isCompact ? "gap-2 rounded-full bg-secondary/50 border border-border px-1.5 py-1" : "gap-3"}`}>
      <button
        onClick={() => value > min && onChange(value - 1)}
        className={`flex items-center justify-center active:scale-90 transition-transform touch-action-manipulation disabled:opacity-30 ${
          isCompact
            ? "w-9 h-9 rounded-full bg-background text-muted-foreground text-xl font-bold border border-border"
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
            ? "w-9 h-9 rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-sm"
            : "w-10 h-10 rounded-full bg-primary text-primary-foreground text-xl font-bold"
        }`}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
};

export default QuantitySelector;
