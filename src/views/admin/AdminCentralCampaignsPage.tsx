import { useState } from "react";
import { toast } from "sonner";
import { Clock, Heart, Gift, TrendingUp, Users, Megaphone, Radio, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdminCentralLayout from "@/components/admin/premium/AdminCentralLayout";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminPreviewTabs from "@/components/admin/premium/AdminPreviewTabs";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import AdminTenantListPanel from "@/components/admin/premium/AdminTenantListPanel";
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

const WINE = "#3a0205";

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
      description="Acesso a marketing push, campanhas automáticas e limites por restaurante."
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
  const { data: mktSettings, refetch: refetchMkt } = useTenantMarketingSettings(tenantId);
  const [savingMkt, setSavingMkt] = useState<string | null>(null);

  const activeCampaigns = CAMPAIGN_TEMPLATES.filter((t) => {
    const f = flags?.find((x) => x.feature_key === t.featureKey);
    return f?.enabled;
  }).length;

  const toggleMkt = async (key: string, value: boolean) => {
    setSavingMkt(key);
    try {
      await upsertTenantMarketingSettings(tenantId, { [key]: value });
      await refetchMkt();
      toast.success("Definição guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingMkt(null);
    }
  };

  const mktRows = [
    { key: "push_enabled", label: "Marketing push activo", icon: Radio },
    { key: "auto_campaigns_enabled", label: "Campanhas automáticas", icon: Megaphone },
    { key: "manual_broadcast_enabled", label: "Envio manual / broadcast", icon: Send },
  ] as const;

  return (
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Modelos", value: String(CAMPAIGN_TEMPLATES.length) },
            { label: "Preparadas", value: String(activeCampaigns), tone: activeCampaigns ? "success" : "muted" },
            {
              label: "Anti-spam",
              value: (mktSettings?.anti_spam_max_pushes ?? 0) <= 0
                ? "Desligado"
                : `${mktSettings?.anti_spam_max_pushes}/${mktSettings?.anti_spam_window_days ?? 1}d`,
              tone: "muted",
            },
            { label: "Motor", value: mktSettings?.auto_campaigns_enabled === false ? "Pausado" : "Activo", tone: "success" },
          ]}
        />
      )}

      {isScoped && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-bold" style={{ color: WINE }}>
            Acesso marketing, {tenantPlan.toUpperCase()}
          </h3>
          {mktRows.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor={key}>{label}</Label>
              </div>
              <Switch
                id={key}
                checked={mktSettings?.[key] !== false}
                disabled={savingMkt === key}
                onCheckedChange={(v) => void toggleMkt(key, v)}
              />
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Limite: {mktSettings?.max_active_campaigns ?? 10} campanhas activas ·{" "}
            {mktSettings?.max_sends_per_month ?? 500} envios/mês · anti-spam marketing:{" "}
            {(mktSettings?.anti_spam_max_pushes ?? 0) <= 0
              ? "desligado (avisos de pedidos nunca bloqueados)"
              : `máx. ${mktSettings?.anti_spam_max_pushes} push/cliente em ${mktSettings?.anti_spam_window_days ?? 1} dia(s)`}
            .
          </p>
        </div>
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
              meta="Canal: push app + web · Agendamento e winback activos"
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
