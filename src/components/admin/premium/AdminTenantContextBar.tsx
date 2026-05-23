import { Link } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { cn } from "@/lib/utils";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan?: string | null;
  tenant_plan_assignments?: { is_beta?: boolean }[] | { is_beta?: boolean } | null;
};

type Props = {
  tenants: Tenant[];
  tenantId: string;
  onChange: (id: string) => void;
  isScoped?: boolean;
  scopedSlug?: string;
  centralsPath?: string;
  className?: string;
  allowEmpty?: boolean;
};

function isBeta(t: Tenant): boolean {
  const a = t.tenant_plan_assignments;
  if (Array.isArray(a)) return !!a[0]?.is_beta;
  if (a && typeof a === "object") return !!(a as { is_beta?: boolean }).is_beta;
  return false;
}

export default function AdminTenantContextBar({
  tenants,
  tenantId,
  onChange,
  isScoped,
  scopedSlug,
  centralsPath = "/admin/centrals",
  className,
  allowEmpty,
}: Props) {
  const current = tenantId ? tenants.find((t) => t.id === tenantId) : undefined;
  const plan = (current?.plan as PlanKey) || "start";

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-1 px-1 py-2 bg-secondary/80 backdrop-blur-md border-b border-border/50 space-y-2",
        className,
      )}
    >
      {isScoped && scopedSlug ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{current?.name ?? scopedSlug}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px] h-5 uppercase">
                {PLAN_LABELS[plan]}
              </Badge>
              {current && isBeta(current) && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Beta
                </Badge>
              )}
            </div>
          </div>
          <Link
            to={centralsPath}
            className="text-[10px] font-bold text-primary shrink-0 hover:underline"
          >
            Visão global
          </Link>
        </div>
      ) : (
        <Select value={tenantId || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-11 rounded-xl bg-card border-border/80">
            <SelectValue placeholder={allowEmpty ? "Seleccionar restaurante (opcional)" : "Seleccionar restaurante"} />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  {t.name}
                  <span className="text-muted-foreground text-[10px] uppercase">
                    {PLAN_LABELS[(t.plan as PlanKey) || "start"]}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {current && !isScoped && (
        <Link
          to={`/admin/tenants/${current.slug}/centrals`}
          className="flex items-center justify-between rounded-xl border bg-card/60 px-3 py-2 text-xs hover:bg-card transition-colors"
        >
          <span className="text-muted-foreground">
            Ver centrais só de <span className="font-bold text-foreground">{current.name}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
        </Link>
      )}
    </div>
  );
}
