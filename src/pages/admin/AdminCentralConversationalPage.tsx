import { useEffect, useState } from "react";
import { toast } from "sonner";
import CentralPageShell from "@/components/admin/CentralPageShell";
import CentralTenantPicker from "@/components/admin/CentralTenantPicker";
import FeatureToggleList from "@/components/admin/FeatureToggleList";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import {
  useAdminCentralsTenants,
  useSetFeatureOverride,
  useTenantFeatureFlags,
} from "@/hooks/usePlatformFeatures";

const FLOW_STEPS = [
  "Cliente escreve: «quero 2 kebabs sem cebola»",
  "IA interpreta intenção e monta carrinho",
  "Cliente revê e confirma",
  "Checkout normal (pagamento existente)",
];

export default function AdminCentralConversationalPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [tenantId, setTenantId] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const setOverride = useSetFeatureOverride();

  useEffect(() => {
    if (!tenantId && tenants?.[0]?.id) setTenantId(tenants[0].id);
  }, [tenants, tenantId]);

  const { data: flags } = useTenantFeatureFlags(tenantId);
  const convFlags = (flags ?? []).filter((f) => f.feature_key === "conversational_ordering");

  const onToggle = async (key: string, enabled: boolean) => {
    if (!tenantId) return;
    setSavingKey(key);
    try {
      await setOverride(tenantId, key, enabled);
      toast.success("Actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <CentralPageShell
      title="Conversar para pedir"
      description="Modo conversacional dentro da app — arquitectura preparada; chat funcional numa fase futura."
    >
      {tenants && tenants.length > 0 && (
        <CentralTenantPicker tenants={tenants} value={tenantId} onChange={setTenantId} />
      )}

      <FeatureToggleList features={convFlags} savingKey={savingKey} onToggle={onToggle} preparedOnly />

      <div className="space-y-2 pt-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Fluxo previsto</p>
        {FLOW_STEPS.map((step, i) => (
          <OpsCompactCard
            key={step}
            title={`${i + 1}. ${step}`}
            summary=""
            editable={false}
          />
        ))}
      </div>
    </CentralPageShell>
  );
}
