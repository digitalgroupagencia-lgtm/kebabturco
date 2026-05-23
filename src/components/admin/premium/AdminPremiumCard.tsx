import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlanKey } from "@/lib/platformFeatures";
import PlanGateOverlay from "./PlanGateOverlay";

export type AdminPremiumCardProps = {
  title: string;
  summary?: string;
  meta?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  badges?: { label: string; variant?: "default" | "secondary" | "outline" }[];
  status?: "prepared" | "active" | "disabled" | "locked";
  actions?: React.ReactNode;
  preview?: React.ReactNode;
  footer?: React.ReactNode;
  gated?: boolean;
  requiredPlan?: PlanKey;
  className?: string;
  accent?: string;
};

const statusBadge: Record<NonNullable<AdminPremiumCardProps["status"]>, { label: string; cls: string }> = {
  prepared: { label: "Preparado", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  active: { label: "Activo", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  disabled: { label: "Desligado", cls: "bg-muted text-muted-foreground border-border" },
  locked: { label: "Upgrade", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
};

export default function AdminPremiumCard({
  title,
  summary,
  meta,
  icon: Icon,
  iconClassName,
  badges = [],
  status,
  actions,
  preview,
  footer,
  gated,
  requiredPlan = "pro",
  className,
  accent,
}: AdminPremiumCardProps) {
  const st = status ? statusBadge[status] : null;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md",
        gated && "opacity-95",
        className,
      )}
    >
      {accent && <div className={cn("h-1 w-full bg-gradient-to-r", accent)} />}

      <div className="p-3.5 sm:p-4 space-y-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={cn(
                "shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary",
                iconClassName,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-sm text-foreground">{title}</p>
              {st && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold", st.cls)}>
                  {st.label}
                </Badge>
              )}
              {badges.map((b) => (
                <Badge
                  key={b.label}
                  variant={b.variant ?? "secondary"}
                  className="text-[10px] px-1.5 py-0 h-5 font-semibold"
                >
                  {b.label}
                </Badge>
              ))}
            </div>
            {summary && <p className="text-xs text-muted-foreground mt-1 leading-snug">{summary}</p>}
            {meta && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{meta}</p>}
          </div>
          {actions && !gated && <div className="shrink-0 flex items-center gap-1">{actions}</div>}
        </div>

        {preview && (
          <div className={cn(gated && "pointer-events-none select-none blur-[0.3px]")}>{preview}</div>
        )}

        {footer}
      </div>

      {gated && <PlanGateOverlay requiredPlan={requiredPlan} />}
    </div>
  );
}
