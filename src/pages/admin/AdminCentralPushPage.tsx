import { useState } from "react";
import { toast } from "sonner";
import { Bell, Send, Users, Calendar } from "lucide-react";
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
import {
  getMinPlanForFeature,
  isFeatureAvailableForPlan,
  normalizePlan,
} from "@/lib/platformFeatureGates";
import type { PlanKey } from "@/lib/platformFeatures";

const PUSH_SCENARIOS = [
  {
    key: "promo",
    title: "Promo relâmpago",
    summary: "Notificação instantânea para clientes activos",
    previews: [
      { id: "a", label: "Curta", content: "🔔 -20% nos próximos 60 min — só delivery!" },
      { id: "b", label: "Longa", content: "Esta tarde: kebab + bebida por 9,90€. Toque para pedir." },
    ],
  },
  {
    key: "segment",
    title: "Segmento VIP",
    summary: "Push para clientes frequentes",
    previews: [
      { id: "a", label: "VIP", content: "⭐ Acesso antecipado ao menu especial de fim-de-semana." },
      { id: "b", label: "Inactivos", content: "Sentimos a tua falta — 10% válido hoje até 23h." },
    ],
  },
];

export default function AdminCentralPushPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const setOverride = useSetFeatureOverride();

  const onToggle = async (tenantId: string, enabled: boolean) => {
    setSavingKey("push");
    try {
      await setOverride(tenantId, "push_notifications", enabled);
      toast.success(enabled ? "Push preparado" : "Push desactivado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AdminCentralLayout
      title="Central Push"
      description="Notificações segmentadas e agendadas — infraestrutura preparada, envios automáticos em fase posterior."
      centralSegment="push"
      showTenantList
      tenantList={
        tenants ? <AdminTenantListPanel tenants={tenants} centralSegment="push" /> : null
      }
    >
      {({ tenantId, tenant, isScoped }) => (
        <PushTenantPanel
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

function PushTenantPanel({
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
  onToggle: (tenantId: string, enabled: boolean) => void;
}) {
  const { data: flags } = useTenantFeatureFlags(tenantId);
  const pushFlag = flags?.find((f) => f.feature_key === "push_notifications");
  const gated = !isFeatureAvailableForPlan("push_notifications", tenantPlan);
  const on = pushFlag?.enabled ?? false;

  return (
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Push", value: on ? "Preparado" : "Off", tone: on ? "success" : "muted" },
            { label: "Enviados hoje", value: "0", tone: "muted" },
            { label: "Aberturas", value: "—", tone: "muted" },
            { label: "Motor", value: "Standby", tone: "warning" },
          ]}
        />
      )}

      <AdminPremiumCard
        title="Notificações push"
        summary="Canal principal para campanhas e alertas"
        icon={Bell}
        status={gated ? "locked" : on ? "active" : "prepared"}
        gated={gated}
        requiredPlan={getMinPlanForFeature("push_notifications")}
        meta="Subscritores: — · Permissões: aguardam activação"
        actions={
          !gated ? (
            <Switch
              checked={on}
              disabled={savingKey === "push"}
              onCheckedChange={(v) => onToggle(tenantId, v)}
            />
          ) : undefined
        }
      />

      <div className="space-y-3">
        {PUSH_SCENARIOS.map((s) => (
          <AdminPremiumCard
            key={s.key}
            title={s.title}
            summary={s.summary}
            icon={s.key === "promo" ? Send : Users}
            status={gated ? "locked" : "prepared"}
            gated={gated}
            requiredPlan={getMinPlanForFeature("push_notifications")}
            preview={<AdminPreviewTabs variants={s.previews} bubble={false} />}
            meta="Agendamento: manual · Segmentação: automática (fase 2)"
          />
        ))}
      </div>

      <AdminPremiumCard
        title="Calendário de envios"
        summary="Planeamento visual de notificações"
        icon={Calendar}
        status="prepared"
        meta="Próximo envio: — · Filas: 0"
        preview={
          <div className="rounded-xl border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
            Calendário interactivo chega com o motor de push automático
          </div>
        }
      />
    </div>
  );
}
