import type { LucideIcon } from "lucide-react";
import { Beef, CupSoda, Droplets, Layers, MinusCircle, PlusCircle, Sparkles } from "lucide-react";
import type { ModifierGroup } from "@/lib/modifiers/types";

type Props = {
  group: ModifierGroup;
  title: string;
  subtitle?: string | null;
  badge: string;
  badgeTone: "required" | "optional" | "limit" | "done";
};

export function resolveGroupIcon(group: ModifierGroup): LucideIcon {
  const label = `${group.name.es} ${group.name.pt} ${group.name.en}`.toLowerCase();
  if (/carne|meat|prote|pollo|ternera/.test(label)) return Beef;
  if (/bebida|refresco|drink|boisson|coca|cola/.test(label)) return CupSoda;
  if (/salsa|molho|sauce/.test(label)) return Droplets;
  if (group.groupKind === "removal") return MinusCircle;
  if (group.groupKind === "extra") return PlusCircle;
  if (group.groupKind === "substitution") return Layers;
  return Sparkles;
}

export default function ModifierGroupHeader({ group, title, subtitle, badge, badgeTone }: Props) {
  const Icon = resolveGroupIcon(group);

  const badgeClass =
    badgeTone === "required"
      ? "border-primary/25 bg-primary/8 text-primary"
      : badgeTone === "limit"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
        : badgeTone === "done"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : "border-border bg-secondary/50 text-muted-foreground";

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-black uppercase tracking-[0.06em] text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
        {badge}
      </span>
    </div>
  );
}
