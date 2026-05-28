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
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
        selected ? "border-primary bg-primary/[0.06]" : "border-border/60 bg-card"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          selected ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="flex-1 text-[15px] font-bold leading-tight text-foreground">{title}</span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
        }`}
      >
        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
