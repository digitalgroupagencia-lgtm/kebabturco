import { Check } from "lucide-react";

type Props = {
  title: string;
  selected: boolean;
  onClick: () => void;
};

export default function ModifierChipOption({ title, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_-12px_rgba(139,0,0,0.65)]"
          : "border-border/70 bg-card text-foreground"
      }`}
    >
      {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      <span>{title}</span>
      {selected ? <Check className="h-3.5 w-3.5 opacity-80" strokeWidth={3} /> : null}
    </button>
  );
}
