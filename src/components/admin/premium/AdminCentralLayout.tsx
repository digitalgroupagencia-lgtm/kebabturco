import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AdminPageHeader, { type Breadcrumb } from "./AdminPageHeader";
import AdminTenantContextBar from "./AdminTenantContextBar";
import { useAdminCentralsTenants } from "@/hooks/usePlatformFeatures";

type Props = {
  title: string;
  description: string;
  breadcrumbs?: Breadcrumb[];
  backTo?: string;
  centralSegment: string;
  showTenantList?: boolean;
  tenantList?: React.ReactNode;
  stats?: React.ReactNode;
  children: (ctx: {
    tenantId: string;
    tenant: ReturnType<typeof useAdminCentralsTenants>["data"] extends (infer T)[] | undefined ? T : never;
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

  useEffect(() => {
    if (!isScoped && !selectedId && tenants?.[0]?.id) {
      setSelectedId(tenants[0].id);
    }
  }, [tenants, selectedId, isScoped]);

  const defaultCrumbs: Breadcrumb[] = isScoped && scopedTenant
    ? [
        { label: "Admin", to: "/admin" },
        { label: "Clientes", to: "/admin/tenants" },
        { label: scopedTenant.name, to: `/admin/tenants/${scopedTenant.slug}/centrals` },
        { label: title },
      ]
    : [
        { label: "Admin", to: "/admin" },
        { label: "Centrais", to: "/admin/centrals" },
        { label: title },
      ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs ?? defaultCrumbs}
        backTo={backTo ?? (isScoped ? `/admin/tenants/${slug}/centrals` : "/admin/centrals")}
      />

      {stats}

      {tenants && tenants.length > 0 && (
        <AdminTenantContextBar
          tenants={tenants}
          tenantId={tenantId}
          onChange={setSelectedId}
          isScoped={isScoped}
          scopedSlug={slug}
          centralsPath="/admin/centrals"
        />
      )}

      {showTenantList && !isScoped && tenantList}

      {tenantId && tenant ? children({ tenantId, tenant, isScoped }) : null}
    </div>
  );
}

export { useParams as useCentralSlugParam };
