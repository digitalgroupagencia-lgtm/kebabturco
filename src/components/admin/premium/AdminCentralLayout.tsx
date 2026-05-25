import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AdminPageHeader, { type Breadcrumb } from "./AdminPageHeader";
import AdminTenantContextBar from "./AdminTenantContextBar";
import GlobalCentralOperations from "./GlobalCentralOperations";
import PlatformPageShell from "./PlatformPageShell";
import { useAdminCentralsTenants } from "@/hooks/usePlatformFeatures";
import type { CentralSegment } from "@/lib/operationalCentralMetrics";
import { centralAdminPath } from "@/lib/adminCentralsNav";
import { nav } from "@/lib/navPaths.ts";

type TenantRow = NonNullable<ReturnType<typeof useAdminCentralsTenants>["data"]>[number];

type Props = {
  title: string;
  description: string;
  breadcrumbs?: Breadcrumb[];
  backTo?: string;
  centralSegment: CentralSegment;
  showTenantList?: boolean;
  tenantList?: React.ReactNode;
  stats?: React.ReactNode;
  children: (ctx: {
    tenantId: string;
    tenant: TenantRow;
    isScoped: boolean;
  }) => React.ReactNode;
};

export default function AdminCentralLayout({
  title,
  description,
  breadcrumbs,
  backTo,
  centralSegment,
  showTenantList,
  tenantList,
  stats,
  children,
}: Props) {
  const { slug } = useParams<{ slug?: string }>();
  const { data: tenants, isLoading } = useAdminCentralsTenants();
  const [selectedId, setSelectedId] = useState("");

  const scopedTenant = slug ? tenants?.find((t) => t.slug === slug) : undefined;
  const isScoped = !!scopedTenant;
  const tenantId = scopedTenant?.id ?? selectedId;
  const tenant = scopedTenant ?? tenants?.find((t) => t.id === tenantId);

  // Global mode: nunca auto-seleccionar o primeiro restaurante
  useEffect(() => {
    if (isScoped && scopedTenant) {
      setSelectedId(scopedTenant.id);
    }
  }, [isScoped, scopedTenant?.id]);

  const defaultCrumbs: Breadcrumb[] = isScoped && scopedTenant
    ? [
        { label: "Plataforma", to: nav.admin() },
        { label: "Clientes", to: nav.admin("tenants") },
        { label: scopedTenant.name, to: nav.admin("tenants", scopedTenant.slug) },
        { label: title },
      ]
    : [
        { label: "Plataforma", to: nav.admin() },
        { label: "Centrais", to: centralAdminPath() },
        { label: title },
      ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showGlobalOverview = !isScoped && !tenantId && tenants && tenants.length > 0;

  return (
    <PlatformPageShell width="default">
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs ?? defaultCrumbs}
        backTo={backTo ?? (isScoped ? nav.admin("tenants", slug!, "centrals") : centralAdminPath())}
      />

      {stats}

      {tenants && tenants.length > 0 && (
        <AdminTenantContextBar
          tenants={tenants}
          tenantId={tenantId}
          onChange={setSelectedId}
          isScoped={isScoped}
          scopedSlug={slug}
          centralsPath={centralAdminPath()}
          allowEmpty={!isScoped}
        />
      )}

      {showTenantList && !isScoped && tenantList}

      {showGlobalOverview && (
        <GlobalCentralOperations
          centralTitle={title}
          tenants={tenants}
          centralSegment={centralSegment}
        />
      )}

      {tenantId && tenant ? children({ tenantId, tenant, isScoped }) : null}
    </PlatformPageShell>
  );
}

export { useParams as useCentralSlugParam };
