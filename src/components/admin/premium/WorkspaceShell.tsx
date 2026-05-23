import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusPill from "./StatusPill";
import { PLAN_LABELS, type PlanKey } from "@/lib/platformFeatures";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";

const TABS = [
  { label: "Overview", segment: "" },
  { label: "Centrais", segment: "centrals" },
  { label: "Pedidos", segment: "orders" },
  { label: "Branding", segment: "branding" },
] as const;

type Props = {
  children: React.ReactNode;
  wide?: boolean;
};

export default function WorkspaceShell({ children, wide }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { tenant, loading } = useSelectedTenant();
  const base = `/admin/tenants/${slug}`;

  const activeTab = (() => {
    if (location.pathname.includes("/centrals")) return "centrals";
    if (location.pathname.includes("/orders")) return "orders";
    if (location.pathname.includes("/branding")) return "branding";
    if (location.pathname === base || location.pathname === `${base}/`) return "";
    return null;
  })();

  const plan = (tenant?.plan as PlanKey) || "start";

  return (
    <div className={cn("mx-auto w-full space-y-4 pb-10", wide ? "max-w-7xl" : "max-w-5xl")}>
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-secondary/90 backdrop-blur-md border-b border-border/50 space-y-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/tenants"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold truncate">
              {loading ? "A carregar…" : tenant?.name ?? slug}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusPill label={PLAN_LABELS[plan]} tone={plan === "premium" ? "beta" : "active"} />
              <StatusPill label="Workspace" tone="neutral" />
            </div>
          </div>
          <Link
            to="/admin"
            className="text-[11px] font-bold text-primary hover:underline shrink-0 hidden sm:inline"
          >
            ← Plataforma
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
          {TABS.map((tab) => {
            const href = tab.segment ? `${base}/${tab.segment}` : base;
            const isActive = activeTab === tab.segment;
            return (
              <Link
                key={tab.label}
                to={href}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
