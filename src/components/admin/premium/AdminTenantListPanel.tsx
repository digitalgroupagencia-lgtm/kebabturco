import { Link } from "react-router-dom";
import { Building2, ChevronRight } from "lucide-react";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import AdminPremiumCard from "./AdminPremiumCard";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan?: string | null;
  is_active?: boolean;
};

type Props = {
  tenants: Tenant[];
  centralSegment: string;
  title?: string;
};

export default function AdminTenantListPanel({ tenants, centralSegment, title = "Restaurantes" }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-0.5">{title}</p>
      {tenants.map((t) => (
        <Link key={t.id} to={`/admin/tenants/${t.slug}/centrals/${centralSegment}`}>
          <AdminPremiumCard
            title={t.name}
            summary={`/${t.slug}`}
            icon={Building2}
            badges={[
              { label: PLAN_LABELS[(t.plan as PlanKey) || "start"], variant: "outline" },
              ...(t.is_active === false ? [{ label: "Inactivo", variant: "secondary" as const }] : []),
            ]}
            actions={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            className="cursor-pointer hover:border-primary/30"
          />
        </Link>
      ))}
    </div>
  );
}
