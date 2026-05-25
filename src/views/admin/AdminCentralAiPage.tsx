import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bot,
  Headphones,
  ShoppingBag,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AdminCentralLayout from "@/components/admin/premium/AdminCentralLayout";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminPreviewTabs from "@/components/admin/premium/AdminPreviewTabs";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import AdminTenantListPanel from "@/components/admin/premium/AdminTenantListPanel";
import AdminCollapsibleSection from "@/components/admin/premium/AdminCollapsibleSection";
import {
  upsertTenantAiModule,
  useAdminCentralsTenants,
  useTenantAiModules,
} from "@/hooks/usePlatformFeatures";
import { AI_MODULES } from "@/lib/platformFeatures";
import { AI_MODULE_PREVIEWS } from "@/lib/adminCentralPreviews";
import {
  AI_MODULE_FEATURES,
  getMinPlanForFeature,
  isFeatureAvailableForPlan,
  normalizePlan,
} from "@/lib/platformFeatureGates";
import type { PlanKey } from "@/lib/platformFeatures";
import { useState } from "react";

const MODULE_ICONS: Record<string, typeof Bot> = {
  support: Headphones,
  seller: ShoppingBag,
  recovery: RefreshCw,
  marketing: Sparkles,
};

export default function AdminCentralAiPage() {
  const qc = useQueryClient();
  const { data: tenants } = useAdminCentralsTenants();
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (tenantId: string, moduleKey: string, enabled: boolean) => {
    setSaving(`${tenantId}-${moduleKey}`);
    try {
      await upsertTenantAiModule(tenantId, moduleKey, enabled);
      await qc.invalidateQueries({ queryKey: ["tenant-ai-modules", tenantId] });
      toast.success(enabled ? "Módulo preparado" : "Módulo desactivado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(null);
    }
  };

  return (
    <AdminCentralLayout
      title="Central IA"
      description="Plataforma inteligente por restaurante. Pré-visualizações activas — motores automáticos chegam numa fase posterior."
      centralSegment="ai"
      showTenantList
      tenantList={
        tenants ? <AdminTenantListPanel tenants={tenants} centralSegment="ai" /> : null
      }
    >
      {({ tenantId, tenant, isScoped }) => (
        <AiTenantPanel
          tenantId={tenantId}
          tenantPlan={normalizePlan(tenant.plan)}
          isScoped={isScoped}
          saving={saving}
          onToggle={toggle}
        />
      )}
    </AdminCentralLayout>
  );
}

function AiTenantPanel({
  tenantId,
  tenantPlan,
  isScoped,
  saving,
  onToggle,
}: {
  tenantId: string;
  tenantPlan: PlanKey;
  isScoped: boolean;
  saving: string | null;
  onToggle: (tenantId: string, moduleKey: string, enabled: boolean) => void;
}) {
  const { data: modules } = useTenantAiModules(tenantId);
  const enabledCount = modules?.filter((m) => m.is_enabled).length ?? 0;

  return (
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Módulos ligados", value: `${enabledCount}/4`, tone: enabledCount ? "success" : "muted" },
            { label: "Plano", value: tenantPlan.toUpperCase() },
            { label: "Motor IA", value: "Standby", tone: "warning" },
            { label: "Conversas hoje", value: "—", tone: "muted" },
          ]}
        />
      )}

      <div className="space-y-3">
        {AI_MODULES.map((m) => {
          const featureKey = AI_MODULE_FEATURES[m.key] ?? "ai_support";
          const gated = !isFeatureAvailableForPlan(featureKey, tenantPlan);
          const requiredPlan = getMinPlanForFeature(featureKey);
          const row = modules?.find((x) => x.module_key === m.key);
          const on = row?.is_enabled ?? false;
          const preview = AI_MODULE_PREVIEWS[m.key];
          const Icon = MODULE_ICONS[m.key] ?? Bot;

          return (
            <AdminPremiumCard
              key={m.key}
              title={m.label}
              summary={m.desc}
              icon={Icon}
              status={gated ? "locked" : on ? "active" : "prepared"}
              meta={preview ? `${preview.metricLabels[0]}: — · ${preview.metricLabels[1]}: —` : undefined}
              gated={gated}
              requiredPlan={requiredPlan}
              preview={preview ? <AdminPreviewTabs variants={preview.variants} /> : undefined}
              actions={
                !gated ? (
                  <Switch
                    checked={on}
                    disabled={saving === `${tenantId}-${m.key}`}
                    onCheckedChange={(v) => onToggle(tenantId, m.key, v)}
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>

      <AdminCollapsibleSection
        title="Como funcionará"
        summary="Fluxo previsto quando os motores forem activados"
      >
        <div className="space-y-2 text-xs text-muted-foreground px-1 pb-2 leading-relaxed">
          <p>1. Cliente ou equipa interactua via chat ou sugestões contextuais.</p>
          <p>2. A plataforma interpreta intenção com base no cardápio e regras do restaurante.</p>
          <p>3. Respostas e acções passam por revisão configurável antes de automação total.</p>
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}
