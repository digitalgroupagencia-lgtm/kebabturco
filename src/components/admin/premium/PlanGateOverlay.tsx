import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanKey } from "@/lib/platformFeatures";
import { upgradeLabelForPlan } from "@/lib/platformFeatureGates";

type Props = {
  requiredPlan: PlanKey;
  compact?: boolean;
  className?: string;
};

export default function PlanGateOverlay({ requiredPlan, compact, className }: Props) {
  return (
    <div
      className={`absolute inset-0 z-10 flex items-end sm:items-center justify-center rounded-2xl bg-gradient-to-t from-background/95 via-background/80 to-background/40 backdrop-blur-[2px] p-3 ${className ?? ""}`}
    >
      <div
        className={`text-center w-full max-w-[240px] rounded-xl border bg-card/95 shadow-lg px-3 py-2.5 ${compact ? "py-2" : ""}`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-bold text-foreground">{upgradeLabelForPlan(requiredPlan)}</span>
        </div>
        {!compact && (
          <p className="text-[10px] text-muted-foreground mb-2 leading-snug">
            Funcionalidade preparada — activa com upgrade de plano.
          </p>
        )}
        <Button size="sm" className="h-8 text-xs w-full gap-1.5" asChild>
          <Link to="/admin/plans">
            <Sparkles className="h-3.5 w-3.5" />
            Ver planos
          </Link>
        </Button>
      </div>
    </div>
  );
}
