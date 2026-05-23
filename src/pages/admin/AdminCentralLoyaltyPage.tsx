import { useEffect, useState } from "react";
import { toast } from "sonner";
import CentralPageShell from "@/components/admin/CentralPageShell";
import CentralTenantPicker from "@/components/admin/CentralTenantPicker";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import {
  useAdminCentralsTenants,
  useSetFeatureOverride,
  useTenantFeatureFlags,
  useTenantLoyaltyProgram,
} from "@/hooks/usePlatformFeatures";
import { LOYALTY_MODELS } from "@/lib/platformFeatures";

export default function AdminCentralLoyaltyPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [tenantId, setTenantId] = useState("");
  const setOverride = useSetFeatureOverride();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId && tenants?.[0]?.id) setTenantId(tenants[0].id);
  }, [tenants, tenantId]);

  const { data: flags } = useTenantFeatureFlags(tenantId);
  const loyaltyOn = flags?.find((f) => f.feature_key === "loyalty")?.enabled ?? false;
  const { data: program } = useTenantLoyaltyProgram(tenantId);

  const toggleLoyalty = async (enabled: boolean) => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await setOverride(tenantId, "loyalty", enabled);
      toast.success(enabled ? "Fidelidade activa" : "Fidelidade desactivada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CentralPageShell
      title="Central Fidelidade"
      description="Escolher modelo por restaurante. Carimbos já funcionam no painel; outros modelos em preparação."
    >
      {tenants && tenants.length > 0 && (
        <CentralTenantPicker tenants={tenants} value={tenantId} onChange={setTenantId} />
      )}

      <OpsCompactCard
        title="Programa de fidelidade"
        summary={loyaltyOn ? "Incluído no plano ou activo manualmente" : "Desactivado para este cliente"}
        badges={loyaltyOn ? ["Activo"] : ["Inactivo"]}
        editable={false}
        actions={
          <button
            type="button"
            className="text-xs font-bold text-primary"
            disabled={saving}
            onClick={() => toggleLoyalty(!loyaltyOn)}
          >
            {loyaltyOn ? "Desactivar" : "Activar"}
          </button>
        }
      />

      <div className="space-y-2">
        {LOYALTY_MODELS.map((m) => {
          const active = program?.model_type === m.key;
          const prepared = m.key !== "stamps";
          return (
            <OpsCompactCard
              key={m.key}
              title={m.label}
              summary={m.desc}
              badges={active ? ["Actual"] : prepared ? ["Em breve"] : []}
              inactive={prepared && !active}
              editable={false}
            />
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Modelos alternativos (pontos, cashback, VIP) serão configuráveis na próxima fase.
      </p>
    </CentralPageShell>
  );
}
