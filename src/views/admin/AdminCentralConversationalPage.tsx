import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
} from "@/hooks/usePlatformFeatures";
import { CONVERSATIONAL_PREVIEWS } from "@/lib/adminCentralPreviews";
import {
  getMinPlanForFeature,
  isFeatureAvailableForPlan,
  normalizePlan,
} from "@/lib/platformFeatureGates";
import type { PlanKey } from "@/lib/platformFeatures";

const FLOW_STEPS = [
  "Cliente escreve o pedido em linguagem natural",
  "A plataforma monta o carrinho automaticamente",
  "Cliente revê e confirma antes de pagar",
  "Checkout normal com pagamentos existentes",
];

export default function AdminCentralConversationalPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const setOverride = useSetFeatureOverride();

  const onToggle = async (tenantId: string, enabled: boolean) => {
    setSavingKey("conv");
    try {
      await setOverride(tenantId, "conversational_ordering", enabled);
      toast.success(enabled ? "Modo conversacional preparado" : "Desactivado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <AdminCentralLayout
      title="Conversar para pedir"
      description="Pedido por conversa dentro da app — pré-visualização activa, chat funcional numa fase futura."
      centralSegment="conversational"
      showTenantList
      tenantList={
        tenants ? <AdminTenantListPanel tenants={tenants} centralSegment="conversational" /> : null
      }
    >
      {({ tenantId, tenant, isScoped }) => (
        <ConversationalPanel
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

function ConversationalPanel({
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
  const conv = flags?.find((f) => f.feature_key === "conversational_ordering");
  const gated = !isFeatureAvailableForPlan("conversational_ordering", tenantPlan);
  const on = conv?.enabled ?? false;

  return (
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Modo chat", value: on ? "Preparado" : "Off", tone: on ? "success" : "muted" },
            { label: "Conversas", value: "—", tone: "muted" },
            { label: "Conversão", value: "—", tone: "muted" },
            { label: "Motor", value: "Standby", tone: "warning" },
          ]}
        />
      )}

      <AdminPremiumCard
        title="Pedido por conversa"
        summary="Canal conversacional integrado no site/app do restaurante"
        icon={MessageCircle}
        status={gated ? "locked" : on ? "active" : "prepared"}
        gated={gated}
        requiredPlan={getMinPlanForFeature("conversational_ordering")}
        preview={<AdminPreviewTabs variants={CONVERSATIONAL_PREVIEWS} />}
        actions={
          !gated ? (
            <Switch
              checked={on}
              disabled={savingKey === "conv"}
              onCheckedChange={(v) => onToggle(tenantId, v)}
            />
          ) : undefined
        }
      />

      <AdminCollapsibleSection title="Fluxo previsto" summary="4 passos até checkout">
        <ol className="space-y-2 px-1 pb-2">
          {FLOW_STEPS.map((step, i) => (
            <li key={step} className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </AdminCollapsibleSection>
    </div>
  );
}
