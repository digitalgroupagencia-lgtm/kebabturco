import { Building2, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import AdminStatStrip from "./AdminStatStrip";
import StatusPill from "./StatusPill";
import { ADMIN_CENTRALS } from "@/lib/adminCentralsNav";
import { ChevronRight } from "lucide-react";

type Tenant = { id: string; name: string; slug: string; plan?: string | null; is_active?: boolean };

type Props = {
  centralTitle: string;
  tenants: Tenant[];
  centralSegment: string;
};

export default function GlobalCentralOverview({ centralTitle, tenants, centralSegment }: Props) {
  const activeCount = tenants.filter((t) => t.is_active !== false).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
          <Layers className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">Visão global — {centralTitle}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
          Escolhe um restaurante abaixo para ver detalhes e configurar. Nenhum cliente está
          seleccionado por defeito.
        </p>
        <StatusPill label="Plataforma" tone="neutral" className="mt-3" />
      </div>

      <AdminStatStrip
        stats={[
          { label: "Clientes activos", value: String(activeCount), tone: "success" },
          { label: "Total clientes", value: String(tenants.length) },
          { label: "Modo", value: "Global", tone: "muted" },
          { label: "Central", value: centralTitle.split(" ").pop() ?? "—", tone: "warning" },
        ]}
      />

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
          Entrar num restaurante
        </p>
        <div className="space-y-1.5">
          {tenants.map((t) => (
            <Link
              key={t.id}
              to={`/admin/tenants/${t.slug}/centrals/${centralSegment}`}
              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{t.plan ?? "start"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Ou usa o selector no topo para pré-visualizar um cliente sem sair desta página.
      </p>
    </div>
  );
}
