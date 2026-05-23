import { useEffect, useState } from "react";
import { toast } from "sonner";
import CentralPageShell from "@/components/admin/CentralPageShell";
import CentralTenantPicker from "@/components/admin/CentralTenantPicker";
import FeatureToggleList from "@/components/admin/FeatureToggleList";
import {
  useAdminCentralsTenants,
  useSetFeatureOverride,
  useTenantFeatureFlags,
} from "@/hooks/usePlatformFeatures";

export default function AdminCentralPushPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [tenantId, setTenantId] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const setOverride = useSetFeatureOverride();

  useEffect(() => {
    if (!tenantId && tenants?.[0]?.id) setTenantId(tenants[0].id);
  }, [tenants, tenantId]);

  const { data: flags } = useTenantFeatureFlags(tenantId);
  const groupFlags = (flags ?? []).filter((f) => f.central_group === "push");

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
      title="Central Push"
      description="Push manual, segmentado e agendado — preparado; métricas e campanhas automáticas chegam depois."
    >
      {tenants && tenants.length > 0 && (
        <CentralTenantPicker tenants={tenants} value={tenantId} onChange={setTenantId} />
      )}
      <FeatureToggleList features={groupFlags} savingKey={savingKey} onToggle={onToggle} preparedOnly />
    </CentralPageShell>
  );
}
