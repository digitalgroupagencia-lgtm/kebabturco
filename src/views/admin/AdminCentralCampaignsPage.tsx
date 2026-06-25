import { useState } from "react";
import { toast } from "sonner";
import { Clock, Heart, Gift, TrendingUp, Users, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminCentralLayout from "@/components/admin/premium/AdminCentralLayout";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminPreviewTabs from "@/components/admin/premium/AdminPreviewTabs";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import AdminTenantListPanel from "@/components/admin/premium/AdminTenantListPanel";
import AdminCollapsibleSection from "@/components/admin/premium/AdminCollapsibleSection";
import {
  useAdminCentralsTenants,
  useSetFeatureOverride,
  useTenantFeatureFlags,
  useTenantMarketingSettings,
  upsertTenantMarketingSettings,
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
      description="Modelos visuais e controlos de acesso marketing por restaurante."
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
  const { data: mktSettings, refetch } = useTenantMarketingSettings(tenantId);
  const [savingMkt, setSavingMkt] = useState(false);

  const activeCampaigns = CAMPAIGN_TEMPLATES.filter((t) => {
    const f = flags?.find((x) => x.feature_key === t.featureKey);
    return f?.enabled;
  }).length;

  const patchSettings = async (patch: Record<string, unknown>) => {
    setSavingMkt(true);
    try {
      await upsertTenantMarketingSettings(tenantId, patch);
      await refetch();
      toast.success("Definições guardadas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingMkt(false);
    }
  };

  return (
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Modelos", value: String(CAMPAIGN_TEMPLATES.length) },
            { label: "Preparadas", value: String(activeCampaigns), tone: activeCampaigns ? "success" : "muted" },
            { label: "Anti-spam", value: `${mktSettings?.anti_spam_max_pushes ?? 2}/${mktSettings?.anti_spam_window_days ?? 30}d` },
            { label: "Motor", value: mktSettings?.auto_campaigns_enabled ? "Activo" : "Pausado", tone: mktSettings?.auto_campaigns_enabled ? "success" : "warning" },
          ]}
        />
      )}

      <AdminCollapsibleSection title="Acesso marketing" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: "push_enabled", label: "Push activo" },
            { key: "auto_campaigns_enabled", label: "Campanhas automáticas" },
            { key: "manual_broadcast_enabled", label: "Envio manual" },
            { key: "ai_suggestions_enabled", label: "Sugestões IA (fase 5)" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">{label}</span>
              <Switch
                checked={Boolean(mktSettings?.[key as keyof typeof mktSettings])}
                disabled={savingMkt}
                onCheckedChange={(v) => void patchSettings({ [key]: v })}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <div>
            <Label className="text-xs">Máx. campanhas activas</Label>
            <Input
              type="number"
              className="h-9 mt-1"
              defaultValue={mktSettings?.max_active_campaigns ?? 10}
              onBlur={(e) => void patchSettings({ max_active_campaigns: Number(e.target.value) || 10 })}
            />
          </div>
          <div>
            <Label className="text-xs">Máx. envios/mês</Label>
            <Input
              type="number"
              className="h-9 mt-1"
              defaultValue={mktSettings?.max_sends_per_month ?? 500}
              onBlur={(e) => void patchSettings({ max_sends_per_month: Number(e.target.value) || 500 })}
            />
          </div>
          <div>
            <Label className="text-xs">Anti-spam: máx. pushes</Label>
            <Input
              type="number"
              className="h-9 mt-1"
              defaultValue={mktSettings?.anti_spam_max_pushes ?? 2}
              onBlur={(e) => void patchSettings({ anti_spam_max_pushes: Number(e.target.value) || 2 })}
            />
          </div>
          <div>
            <Label className="text-xs">Janela anti-spam (dias)</Label>
            <Input
              type="number"
              className="h-9 mt-1"
              defaultValue={mktSettings?.anti_spam_window_days ?? 30}
              onBlur={(e) => void patchSettings({ anti_spam_window_days: Number(e.target.value) || 30 })}
            />
          </div>
        </div>
      </AdminCollapsibleSection>

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
              meta="Canal: push nativo + web · Idioma: último pedido"
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
