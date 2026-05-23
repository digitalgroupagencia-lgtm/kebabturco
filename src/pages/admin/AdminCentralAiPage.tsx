import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CentralPageShell from "@/components/admin/CentralPageShell";
import CentralTenantPicker from "@/components/admin/CentralTenantPicker";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { Switch } from "@/components/ui/switch";
import {
  useAdminCentralsTenants,
  upsertTenantAiModule,
  useTenantAiModules,
} from "@/hooks/usePlatformFeatures";
import { AI_MODULES } from "@/lib/platformFeatures";

export default function AdminCentralAiPage() {
  const qc = useQueryClient();
  const { data: tenants } = useAdminCentralsTenants();
  const [tenantId, setTenantId] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId && tenants?.[0]?.id) setTenantId(tenants[0].id);
  }, [tenants, tenantId]);

  const { data: modules } = useTenantAiModules(tenantId);

  const toggle = async (moduleKey: string, enabled: boolean) => {
    if (!tenantId) return;
    setSaving(moduleKey);
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
    <CentralPageShell
      title="Central IA"
      description="Activar módulos por restaurante. IA funcional chega numa fase posterior — agora só estrutura e toggles."
    >
      {tenants && tenants.length > 0 && (
        <CentralTenantPicker tenants={tenants} value={tenantId} onChange={setTenantId} />
      )}

      <div className="space-y-2">
        {AI_MODULES.map((m) => {
          const row = modules?.find((x) => x.module_key === m.key);
          const on = row?.is_enabled ?? false;
          return (
            <OpsCompactCard
              key={m.key}
              title={m.label}
              summary={m.desc}
              meta="Estado: preparado (sem motor automático)"
              badges={on ? ["Ligado"] : ["Desligado"]}
              editable={false}
              actions={
                <Switch
                  checked={on}
                  disabled={saving === m.key}
                  onCheckedChange={(v) => toggle(m.key, v)}
                />
              }
            />
          );
        })}
      </div>
    </CentralPageShell>
  );
}
