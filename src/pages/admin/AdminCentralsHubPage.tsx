import { Link } from "react-router-dom";
import { Loader2, Layers } from "lucide-react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import { useAdminCentralsTenants, usePlatformPlans } from "@/hooks/usePlatformFeatures";
import { ADMIN_CENTRALS } from "@/lib/adminCentralsNav";
import { ChevronRight, Building2 } from "lucide-react";

export default function AdminCentralsHubPage() {
  const { data: plans, isLoading: loadingPlans } = usePlatformPlans();
  const { data: tenants, isLoading: loadingTenants } = useAdminCentralsTenants();

  const planSummary = (plans ?? []).map((p) => p.name).join(" · ") || "START · PRO · PREMIUM";

  if (loadingPlans || loadingTenants) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <AdminPageHeader
        title="Centrais operacionais"
        description="Visão global da plataforma. Escolhe uma central ou entra directamente num restaurante."
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Centrais" },
        ]}
      />

      <AdminStatStrip
        stats={[
          { label: "Planos", value: String(plans?.length ?? 3) },
          { label: "Centrais", value: String(ADMIN_CENTRALS.length) },
          { label: "Clientes", value: String(tenants?.length ?? 0), tone: "success" },
          { label: "Motores", value: "Standby", tone: "warning" },
        ]}
      />

      <AdminPremiumCard
        title="Planos activos"
        summary={planSummary}
        icon={Layers}
        status="active"
        meta="Funcionalidades desbloqueadas por plano — sem limite de pedidos"
        actions={
          <Link to="/admin/plans" className="text-xs font-bold text-primary hover:underline shrink-0">
            Comparar
          </Link>
        }
      />

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 px-0.5">
          Centrais
        </p>
        <div className="space-y-2">
          {ADMIN_CENTRALS.map((c) => (
            <Link key={c.segment} to={c.globalPath}>
              <AdminPremiumCard
                title={c.title}
                summary={c.desc}
                icon={c.icon}
                status="prepared"
                actions={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
                className="hover:border-primary/30 cursor-pointer"
              />
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 px-0.5">
          Por restaurante
        </p>
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
          {tenants?.map((t) => (
            <Link key={t.id} to={`/admin/tenants/${t.slug}/centrals`}>
              <AdminPremiumCard
                title={t.name}
                summary="Centrais dedicadas deste cliente"
                icon={Building2}
                badges={[{ label: String(t.plan ?? "start").toUpperCase(), variant: "outline" }]}
                actions={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
                className="hover:border-primary/30 cursor-pointer"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
