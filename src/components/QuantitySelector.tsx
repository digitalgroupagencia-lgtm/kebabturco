interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

const QuantitySelector = ({ value, onChange, min = 0, max = 20 }: Props) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => value > min && onChange(value - 1)}
      className="w-10 h-10 rounded-full bg-secondary text-foreground text-xl font-bold flex items-center justify-center active:scale-90 transition-transform touch-action-manipulation disabled:opacity-30"
      disabled={value <= min}
    >
      −
    </button>
    <span className="text-lg font-black w-6 text-center text-foreground">{value}</span>
    <button
      onClick={() => value < max && onChange(value + 1)}
      className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center active:scale-90 transition-transform touch-action-manipulation disabled:opacity-30"
      disabled={value >= max}
    >
      +
    </button>
  </div>
);

export default QuantitySelector;
