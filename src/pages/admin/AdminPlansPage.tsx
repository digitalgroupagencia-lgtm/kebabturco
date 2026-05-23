import { useMemo, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAdminCentralsTenants,
  usePlatformPlans,
  useSetTenantPlan,
  useTenantFeatureFlags,
} from "@/hooks/usePlatformFeatures";
import { CENTRAL_GROUPS, PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";

export default function AdminPlansPage() {
  const { data: plans, isLoading: loadingPlans } = usePlatformPlans();
  const { data: tenants, isLoading: loadingTenants } = useAdminCentralsTenants();
  const setPlan = useSetTenantPlan();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previewTenantId, setPreviewTenantId] = useState<string>("");

  const firstTenantId = tenants?.[0]?.id ?? "";
  const tenantId = previewTenantId || firstTenantId;
  const { data: flags } = useTenantFeatureFlags(tenantId);

  const matrix = useMemo(() => {
    if (!plans?.length) return [];
    return plans.map((p) => ({
      ...p,
      enabledCount: 0,
    }));
  }, [plans]);

  const enabledByPlan = useMemo(() => {
    const map: Record<string, number> = { start: 6, pro: 14, premium: 22 };
    return map;
  }, []);

  const changePlan = async (tenantId: string, planKey: PlanKey, isBeta: boolean) => {
    setSavingId(tenantId);
    try {
      await setPlan(tenantId, planKey, isBeta);
      toast.success("Plano actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingId(null);
    }
  };

  if (loadingPlans || loadingTenants) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Planos & funcionalidades
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          START, PRO e PREMIUM desbloqueiam funcionalidades — sem limite de pedidos.
        </p>
      </div>

      <div className="grid gap-2">
        {matrix.map((p) => (
          <OpsCompactCard
            key={p.plan_key}
            title={p.name}
            summary={p.description || ""}
            meta={`~${enabledByPlan[p.plan_key as PlanKey] ?? "—"} funcionalidades`}
            editable={false}
          />
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2">Clientes</h3>
        <div className="space-y-2">
          {tenants?.map((t) => {
            const isBeta = (t.tenant_plan_assignments as { is_beta?: boolean }[] | null)?.[0]?.is_beta;
            return (
              <OpsCompactCard
                key={t.id}
                title={t.name}
                summary={`Plano actual: ${PLAN_LABELS[(t.plan as PlanKey) || "start"] || t.plan}`}
                badges={isBeta ? ["Beta"] : []}
                editable={false}
                actions={
                  <Select
                    value={(t.plan as string) || "start"}
                    disabled={savingId === t.id}
                    onValueChange={(v) => changePlan(t.id, v as PlanKey, t.slug === "kebab-turco")}
                  >
                    <SelectTrigger className="h-9 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="start">START</SelectItem>
                      <SelectItem value="pro">PRO</SelectItem>
                      <SelectItem value="premium">PREMIUM</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            );
          })}
        </div>
      </div>

      {tenantId && flags && (
        <div>
          <h3 className="text-sm font-bold mb-2">Pré-visualizar funcionalidades</h3>
          <Select value={tenantId} onValueChange={setPreviewTenantId}>
            <SelectTrigger className="h-10 mb-2 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tenants?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {Object.entries(CENTRAL_GROUPS).map(([key, label]) => {
              const count = flags.filter((f) => f.central_group === key && f.enabled).length;
              if (!count) return null;
              return <Badge key={key} variant="secondary" className="text-[10px]">{label}: {count}</Badge>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
