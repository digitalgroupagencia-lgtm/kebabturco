import { useState } from "react";
import { toast } from "sonner";
import { Clock, Heart, Gift, TrendingUp, Users, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import AdminCentralLayout from "@/components/admin/premium/AdminCentralLayout";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminPreviewTabs from "@/components/admin/premium/AdminPreviewTabs";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import AdminTenantListPanel from "@/components/admin/premium/AdminTenantListPanel";
import {
  useAdminCentralsTenants,
  useSetFeatureOverride,
  useTenantFeatureFlags,
} from "@/hooks/usePlatformFeatures";
import { CAMPAIGN_TEMPLATES } from "@/lib/adminCentralPreviews";
import {
  getMinPlanForFeature,
  isFeatureAvailableForPlan,
  normalizePlan,
} from "@/lib/platformFeatureGates";
import type { PlanKey } from "@/lib/platformFeatures";

const TEMPLATE_ICONS = {
  clock: Clock,
  heart: Heart,
  gift: Gift,
  trending: TrendingUp,
  users: Users,
};

export default function AdminCentralCampaignsPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const setOverride = useSetFeatureOverride();

  const onToggle = async (tenantId: string, key: string, enabled: boolean) => {
    setSavingKey(key);
    try {
      await setOverride(tenantId, key, enabled);
      toast.success(enabled ? "Campanha preparada" : "Desactivada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AdminCentralLayout
      title="Central Campanhas"
      description="Modelos visuais prontos a activar. Envios automáticos chegam numa fase posterior."
      centralSegment="campaigns"
      showTenantList
      tenantList={
        tenants ? <AdminTenantListPanel tenants={tenants} centralSegment="campaigns" /> : null
      }
    >
      {({ tenantId, tenant, isScoped }) => (
        <CampaignsTenantPanel
          tenantId={tenantId}
          tenantPlan={normalizePlan(tenant.plan)}
          isScoped={isScoped}
          savingKey={savingKey}
          onToggle={onToggle}
        />
      )}
    </AdminCentralLayout>
  );
}

function CampaignsTenantPanel({
  tenantId,
  tenantPlan,
  isScoped,
  savingKey,
  onToggle,
}: {
  tenantId: string;
  tenantPlan: PlanKey;
  isScoped: boolean;
  savingKey: string | null;
  onToggle: (tenantId: string, key: string, enabled: boolean) => void;
}) {
  const { data: flags } = useTenantFeatureFlags(tenantId);
  const activeCampaigns = CAMPAIGN_TEMPLATES.filter((t) => {
    const f = flags?.find((x) => x.feature_key === t.featureKey);
    return f?.enabled;
  }).length;

  return (
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Modelos", value: String(CAMPAIGN_TEMPLATES.length) },
            { label: "Preparadas", value: String(activeCampaigns), tone: activeCampaigns ? "success" : "muted" },
            { label: "Envios hoje", value: "0", tone: "muted" },
            { label: "Motor", value: "Standby", tone: "warning" },
          ]}
        />
      )}

      <div className="space-y-3">
        {CAMPAIGN_TEMPLATES.map((tpl) => {
          const flag = flags?.find((f) => f.feature_key === tpl.featureKey);
          const gated = !isFeatureAvailableForPlan(tpl.featureKey, tenantPlan);
          const requiredPlan = getMinPlanForFeature(tpl.featureKey);
          const on = flag?.enabled ?? false;
          const Icon = TEMPLATE_ICONS[tpl.icon] ?? Megaphone;

          return (
            <AdminPremiumCard
              key={tpl.key}
              title={tpl.title}
              summary={tpl.subtitle}
              icon={Icon}
              accent={tpl.accent}
              status={gated ? "locked" : on ? "active" : "prepared"}
              meta="Canal: push + in-app · Agendamento: manual (fase 2)"
              gated={gated}
              requiredPlan={requiredPlan}
              preview={<AdminPreviewTabs variants={tpl.previews} bubble={false} />}
              actions={
                !gated ? (
                  <Switch
                    checked={on}
                    disabled={savingKey === tpl.featureKey}
                    onCheckedChange={(v) => onToggle(tenantId, tpl.featureKey, v)}
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
