import { Link } from "react-router-dom";
import { ExternalLink, Map } from "lucide-react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import StatusPill from "@/components/admin/premium/StatusPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ROUTE_MAP_SECTIONS,
  LOVABLE_PREVIEW_PATHS,
  buildRouteOpenUrl,
  type RouteKind,
  type RouteMapEntry,
} from "@/lib/routeMap";
import { nav } from "@/lib/navPaths.ts";
import { cn } from "@/lib/utils";

const kindLabel: Record<RouteKind, string> = {
  real: "Rota real",
  query: "Query / ecrã",
};

const kindTone: Record<RouteKind, "active" | "warning" | "neutral" | "standby"> = {
  real: "active",
  query: "neutral",
};

function RouteRow({ entry }: { entry: RouteMapEntry }) {
  const path = entry.href();
  const openUrl = buildRouteOpenUrl(path);

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{entry.label}</span>
          <StatusPill label={kindLabel[entry.kind]} tone={kindTone[entry.kind]} />
          <StatusPill label="Activa" tone="active" dot />
        </div>
        <code className="block text-xs text-primary break-all bg-muted/50 rounded px-2 py-1">{path}</code>
        <p className="text-xs text-muted-foreground">{entry.description}</p>
        {entry.note && (
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {entry.note}
          </p>
        )}
        <Badge variant="outline" className="text-[10px] font-normal">
          Perfil: {entry.role}
        </Badge>
      </div>
      <div className="shrink-0 flex gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={path}>Abrir</Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={openUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir em nova aba">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export default function AdminRoutesMapPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <AdminPageHeader
        title="Mapa de rotas"
        description="Endereços reais do Kebab Turco para testar no preview Lovable e em produção."
        breadcrumbs={[
          { label: "Administração", to: nav.admin() },
          { label: "Mapa de rotas" },
        ]}
      />

      <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold flex items-center gap-2">
          <Map className="h-4 w-4" />
          Preview Lovable — lista curada
        </p>
        <div className="flex flex-wrap gap-2">
          {LOVABLE_PREVIEW_PATHS.map((p) => (
            <Button key={p} size="sm" variant="secondary" asChild>
              <Link to={p}>{p}</Link>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Se o selector ainda mostrar entradas antigas, sincronize o projecto com o GitHub (branch main) e publique
          de novo.
        </p>
      </div>

      {ROUTE_MAP_SECTIONS.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <h2 className="text-base font-bold">{section.title}</h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>
          <div className="space-y-2">
            {section.routes.map((entry) => (
              <RouteRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
