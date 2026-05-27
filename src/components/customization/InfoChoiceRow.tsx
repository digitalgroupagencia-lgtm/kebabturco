import { Ban, Check, Snowflake, ThermometerSun, type LucideIcon } from "lucide-react";

function resolveIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (/sin hielo|sem gelo|no ice|sans gla/.test(l)) return Ban;
  if (/hielo|gelo|ice|fr[ií]a|gelada|chilled|glaçon/.test(l)) return Snowflake;
  if (/natural|ambiente|room/.test(l)) return ThermometerSun;
  return ThermometerSun;
}

type Props = {
  title: string;
  selected: boolean;
  onClick: () => void;
};

export default function InfoChoiceRow({ title, selected, onClick }: Props) {
  const Icon = resolveIcon(title);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
        selected
          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/15"
          : "border-border/70 bg-card"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          selected ? "bg-emerald-500 text-white" : "bg-secondary/60 text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="flex-1 text-[15px] font-bold text-foreground leading-tight">{title}</span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background"
        }`}
      >
        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
