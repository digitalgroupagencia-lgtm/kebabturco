import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import PlanComparisonGrid from "@/components/admin/premium/PlanComparisonGrid";
import AdminCollapsibleSection from "@/components/admin/premium/AdminCollapsibleSection";
import { Badge } from "@/components/ui/badge";
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

  const flagSummary = flags
    ? `${flags.filter((f) => f.enabled).length} funcionalidades activas`
    : "";

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <AdminPageHeader
        title="Planos & funcionalidades"
        description="START, PRO e PREMIUM desbloqueiam capacidades — sem limite de pedidos."
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Planos" },
        ]}
      />

      <PlanComparisonGrid plans={plans ?? []} />

      <AdminCollapsibleSection
        title="Clientes por plano"
        summary={`${tenants?.length ?? 0} restaurantes · alterar plano ou beta`}
        defaultOpen
      >
        <div className="space-y-2">
          {tenants?.map((t) => {
            const assignments = t.tenant_plan_assignments as { is_beta?: boolean }[] | { is_beta?: boolean } | null;
            const isBeta = Array.isArray(assignments) ? assignments[0]?.is_beta : assignments?.is_beta;
            return (
              <AdminPremiumCard
                key={t.id}
                title={t.name}
                summary={`Plano actual: ${PLAN_LABELS[(t.plan as PlanKey) || "start"]}`}
                badges={isBeta ? [{ label: "Beta" }] : []}
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
      </AdminCollapsibleSection>

      {tenantId && flags && (
        <AdminCollapsibleSection title="Pré-visualizar funcionalidades" summary={flagSummary}>
          <Select value={tenantId} onValueChange={setPreviewTenantId}>
            <SelectTrigger className="h-10 mb-2 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tenants?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            {Object.entries(CENTRAL_GROUPS).map(([key, label]) => {
              const count = flags.filter((f) => f.central_group === key && f.enabled).length;
              if (!count) return null;
              return (
                <Badge key={key} variant="secondary" className="text-[10px]">
                  {label}: {count}
                </Badge>
              );
            })}
          </div>
        </AdminCollapsibleSection>
      )}
    </div>
  );
}
