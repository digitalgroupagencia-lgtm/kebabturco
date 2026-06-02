import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import PlanComparisonGrid from "@/components/admin/premium/PlanComparisonGrid";
import AdminCollapsibleSection from "@/components/admin/premium/AdminCollapsibleSection";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  usePlatformPlans,
  useSetTenantPlan,
  useSetFeatureOverride,
  useTenantFeatureFlags,
} from "@/hooks/usePlatformFeatures";
import { Switch } from "@/components/ui/switch";
import { APP_NAME, DEFAULT_TENANT_SLUG } from "@/lib/appMode";
import { CENTRAL_GROUPS, PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";

export default function AdminPlansPage() {
  const { data: plans, isLoading: loadingPlans } = usePlatformPlans();
  const setPlan = useSetTenantPlan();
  const setFeatureOverride = useSetFeatureOverride();
  const [saving, setSaving] = useState(false);
  const [togglingSeller, setTogglingSeller] = useState(false);

  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ["kebab-tenant-plan", DEFAULT_TENANT_SLUG],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, name, slug, plan, is_active,
          tenant_plan_assignments ( is_beta, plan_id )
        `)
        .eq("slug", DEFAULT_TENANT_SLUG)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const tenantId = tenant?.id ?? null;
  const { data: flags } = useTenantFeatureFlags(tenantId);

  const changePlan = async (planKey: PlanKey) => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await setPlan(tenantId, planKey, tenant?.slug === DEFAULT_TENANT_SLUG);
      toast.success("Plano do Kebab Turco actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  if (loadingPlans || loadingTenant) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const assignments = tenant?.tenant_plan_assignments as { is_beta?: boolean }[] | { is_beta?: boolean } | null;
  const isBeta = Array.isArray(assignments) ? assignments[0]?.is_beta : assignments?.is_beta;
  const currentPlan = (tenant?.plan as PlanKey) || "start";
  const flagSummary = flags
    ? `${flags.filter((f) => f.enabled).length} funcionalidades activas neste plano`
    : "";

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <AdminPageHeader
        title="Planos & funcionalidades"
        description={`Define o plano do ${APP_NAME}: START, PRO ou PREMIUM — com IA, fidelidade, campanhas, etc.`}
        breadcrumbs={[
          { label: "Administração", to: "/admin" },
          { label: "Planos" },
        ]}
      />

      <PlanComparisonGrid plans={plans ?? []} />

      <AdminCollapsibleSection
        title={`Plano actual · ${APP_NAME}`}
        summary={`${PLAN_LABELS[currentPlan]}${isBeta ? " · Beta" : ""}`}
        defaultOpen
      >
        <AdminPremiumCard
          title={tenant?.name ?? APP_NAME}
          summary="Altere o plano para activar ou desactivar módulos (IA, push, fidelidade, campanhas…)"
          badges={[
            { label: PLAN_LABELS[currentPlan] },
            ...(isBeta ? [{ label: "Beta" }] : []),
          ]}
          actions={
            <Select value={currentPlan} disabled={saving || !tenantId} onValueChange={(v) => changePlan(v as PlanKey)}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
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
      </AdminCollapsibleSection>

      {tenantId && flags && (
        <AdminCollapsibleSection title="Benefícios activos neste plano" summary={flagSummary} defaultOpen>
          <div className="space-y-3">
            {flags.filter((f) => f.enabled).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma funcionalidade extra activa — verifique o plano.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {flags
                .filter((f) => f.enabled)
                .map((f) => (
                  <Badge key={f.feature_key} variant="secondary" className="text-[10px]">
                    {f.name}
                  </Badge>
                ))}
            </div>
            <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
              {Object.entries(CENTRAL_GROUPS).map(([key, label]) => {
                const count = flags.filter((f) => f.central_group === key && f.enabled).length;
                if (!count) return null;
                return (
                  <Badge key={key} variant="outline" className="text-[10px]">
                    {label}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        </AdminCollapsibleSection>
      )}
    </div>
  );
}
