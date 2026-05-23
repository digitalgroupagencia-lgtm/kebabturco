import { Link, useParams } from "react-router-dom";
import { Loader2, Layers } from "lucide-react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import AdminPremiumCard from "@/components/admin/premium/AdminPremiumCard";
import AdminStatStrip from "@/components/admin/premium/AdminStatStrip";
import { useAdminCentralsTenants, useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";
import { ADMIN_CENTRALS } from "@/lib/adminCentralsNav";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";

export default function AdminTenantCentralsHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tenants, isLoading } = useAdminCentralsTenants();
  const tenant = tenants?.find((t) => t.slug === slug);
  const { data: flags } = useTenantFeatureFlags(tenant?.id);

  const enabledCount = flags?.filter((f) => f.enabled).length ?? 0;
  const plan = (tenant?.plan as PlanKey) || "start";

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-muted-foreground text-sm">
        Restaurante não encontrado.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <AdminPageHeader
        title={`Centrais · ${tenant.name}`}
        description="Configuração individual deste restaurante. Motores automáticos ainda não activos."
        breadcrumbs={[
          { label: "Clientes", to: "/admin/tenants" },
          { label: tenant.name },
          { label: "Centrais" },
        ]}
        backTo="/admin/tenants"
      />

      <AdminStatStrip
        stats={[
          { label: "Plano", value: PLAN_LABELS[plan] },
          { label: "Funcionalidades", value: String(enabledCount), tone: "success" },
          { label: "Estado", value: "Preparado", tone: "muted" },
          { label: "Motores", value: "Off", tone: "warning" },
        ]}
      />

      <div className="space-y-2">
        {ADMIN_CENTRALS.map((c) => (
          <Link key={c.segment} to={`/admin/tenants/${slug}/centrals/${c.segment}`}>
            <AdminPremiumCard
              title={c.title}
              summary={c.desc}
              icon={c.icon}
              status="prepared"
              actions={<c.icon className="h-4 w-4 text-muted-foreground opacity-0" />}
              className="hover:border-primary/30 cursor-pointer"
            />
          </Link>
        ))}
      </div>

      <Link
        to="/admin/centrals"
        className="block text-center text-xs font-bold text-primary hover:underline pt-2"
      >
        <Layers className="inline h-3.5 w-3.5 mr-1" />
        Visão global de todas as centrais
      </Link>
    </div>
  );
}
