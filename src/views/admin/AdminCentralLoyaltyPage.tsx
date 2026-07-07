import { useState } from "react";
import { toast } from "sonner";
import { Heart, Stamp, Coins, Wallet, Crown } from "lucide-react";
import AdminCentralLayout from "@/components/admin/premium/AdminCentralLayout";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminPreviewTabs from "@/components/admin/premium/AdminPreviewTabs";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import AdminTenantListPanel from "@/components/admin/premium/AdminTenantListPanel";
import AdminCollapsibleSection from "@/components/admin/premium/AdminCollapsibleSection";
import { Button } from "@/components/ui/button";
import {
  useAdminCentralsTenants,
  useSetFeatureOverride,
  useTenantFeatureFlags,
  useTenantLoyaltyProgram,
} from "@/hooks/usePlatformFeatures";
import { LOYALTY_MODELS } from "@/lib/platformFeatures";
import { LOYALTY_PREVIEWS } from "@/lib/adminCentralPreviews";
import {
  getMinPlanForFeature,
  normalizePlan,
} from "@/lib/platformFeatureGates";
import { useTenantFeatureAccess } from "@/hooks/useTenantFeatureAccess";
import type { PlanKey } from "@/lib/platformFeatures";

const MODEL_ICONS: Record<string, typeof Heart> = {
  stamps: Stamp,
  points: Coins,
  cashback: Wallet,
  vip: Crown,
};

export default function AdminCentralLoyaltyPage() {
  const { data: tenants } = useAdminCentralsTenants();
  const [saving, setSaving] = useState(false);

  return (
    <AdminCentralLayout
      title="Central Fidelidade"
      description="Programas de retenção premium. Carimbos activos no painel; outros modelos em preparação visual."
      centralSegment="loyalty"
      showTenantList
      tenantList={
        tenants ? <AdminTenantListPanel tenants={tenants} centralSegment="loyalty" /> : null
      }
    >
      {({ tenantId, tenant, isScoped }) => (
        <LoyaltyTenantPanel tenantId={tenantId} tenantPlan={normalizePlan(tenant.plan)} isScoped={isScoped} saving={saving} setSaving={setSaving} />
      )}
    </AdminCentralLayout>
  );
}

function LoyaltyTenantPanel({
  tenantId,
  tenantPlan,
  isScoped,
  saving,
  setSaving,
}: {
  tenantId: string;
  tenantPlan: PlanKey;
  isScoped: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const setOverride = useSetFeatureOverride();
  const { data: flags } = useTenantFeatureFlags(tenantId);
  const { data: program } = useTenantLoyaltyProgram(tenantId);
  const { isFeatureEnabled } = useTenantFeatureAccess(tenantId);
  const loyaltyOn = flags?.find((f) => f.feature_key === "loyalty")?.enabled ?? false;
  const loyaltyGated = !isFeatureEnabled("loyalty", tenantPlan);

  const toggleLoyalty = async (enabled: boolean) => {
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
    <div className="space-y-4">
      {isScoped && (
        <AdminStatStrip
          stats={[
            { label: "Programa", value: loyaltyOn ? "Activo" : "Off", tone: loyaltyOn ? "success" : "muted" },
            { label: "Modelo", value: program?.model_type ?? "carimbos" },
            { label: "Clientes VIP", value: ", ", tone: "muted" },
            { label: "Recompensas", value: ", ", tone: "muted" },
          ]}
        />
      )}

      <AdminPremiumCard
        title="Programa de fidelidade"
        summary="Activa a central de retenção para este restaurante"
        icon={Heart}
        status={loyaltyGated ? "locked" : loyaltyOn ? "active" : "prepared"}
        gated={loyaltyGated}
        requiredPlan={getMinPlanForFeature("loyalty")}
        actions={
          !loyaltyGated ? (
            <Button
              size="sm"
              variant={loyaltyOn ? "outline" : "default"}
              className="h-8 text-xs"
              disabled={saving}
              onClick={() => toggleLoyalty(!loyaltyOn)}
            >
              {loyaltyOn ? "Desactivar" : "Activar"}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {LOYALTY_MODELS.map((m) => {
          const active = program?.model_type === m.key;
          const preview = LOYALTY_PREVIEWS[m.key];
          const isFuture = m.key !== "stamps";
          const gated = isFuture || !isFeatureEnabled("loyalty", tenantPlan);
          const Icon = MODEL_ICONS[m.key] ?? Heart;

          return (
            <AdminPremiumCard
              key={m.key}
              title={m.label}
              summary={preview?.tagline ?? m.desc}
              icon={Icon}
              status={gated && isFuture ? "prepared" : active ? "active" : gated ? "locked" : "prepared"}
              badges={active ? [{ label: "Actual" }] : isFuture ? [{ label: "Em breve" }] : []}
              gated={gated && isFuture}
              requiredPlan={isFuture ? "premium" : getMinPlanForFeature("loyalty")}
              preview={preview ? <AdminPreviewTabs variants={preview.variants} /> : undefined}
              footer={
                preview ? (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                    {preview.perks.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                ) : undefined
              }
            />
          );
        })}
      </div>

      <AdminCollapsibleSection title="Níveis e recompensas" summary="Placeholder, configuração avançada na fase 2">
        <div className="grid grid-cols-3 gap-2 px-1 pb-2">
          {["Bronze", "Prata", "Ouro"].map((lvl, i) => (
            <div key={lvl} className="rounded-xl border bg-muted/30 p-2.5 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{lvl}</p>
              <p className="text-lg font-black mt-1">{i === 0 ? ", " : i === 1 ? ", " : ", "}</p>
              <p className="text-[9px] text-muted-foreground">clientes</p>
            </div>
          ))}
        </div>
      </AdminCollapsibleSection>
    </div>
  );
}
