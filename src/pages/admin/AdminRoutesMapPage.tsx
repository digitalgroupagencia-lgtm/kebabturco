import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, Map, AlertCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import StatusPill from "@/components/admin/premium/StatusPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ROUTE_MAP_SECTIONS,
  LOVABLE_WILDCARD_HINT,
  buildRouteOpenUrl,
  splitRoutePath,
  type RouteKind,
  type RouteMapEntry,
} from "@/lib/routeMap";
import { cn } from "@/lib/utils";

const kindLabel: Record<RouteKind, string> = {
  real: "Rota real",
  wildcard: "Wildcard",
  query: "Query / ecrã",
  legacy: "Legado",
};

const kindTone: Record<RouteKind, "active" | "warning" | "neutral" | "standby"> = {
  real: "active",
  wildcard: "warning",
  query: "neutral",
  legacy: "standby",
};

function RouteRow({ entry }: { entry: RouteMapEntry }) {
  const { pathname, search } = splitRoutePath(entry.path);
  const to = `${pathname}${search}`;
  const openUrl = buildRouteOpenUrl(entry.path);
  const canOpen = entry.active && entry.kind !== "wildcard";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-3",
        entry.kind === "wildcard" && "border-amber-500/30 bg-amber-500/5",
        !entry.active && "opacity-70",
      )}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{entry.label}</span>
          <StatusPill label={kindLabel[entry.kind]} tone={kindTone[entry.kind]} />
          <StatusPill
            label={entry.active ? "Activa" : "Inactiva"}
            tone={entry.active ? "active" : "standby"}
            dot={entry.active}
          />
        </div>
        <code className="block text-xs text-primary break-all bg-muted/50 rounded px-2 py-1">{entry.path}</code>
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
        {canOpen ? (
          <>
            <Button size="sm" variant="outline" asChild>
              <Link to={to}>Abrir</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={openUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir em nova aba">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" disabled title="Wildcard ou rota inactiva">
            —
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminRoutesMapPage() {
  const [params, setParams] = useSearchParams();
  const showWildcardHint = params.get("routeHint") === LOVABLE_WILDCARD_HINT;

  const dismissHint = () => {
    const next = new URLSearchParams(params);
    next.delete("routeHint");
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <AdminPageHeader
        title="Mapa de rotas"
        description="Endereços reais do Kebab Turco para testar no preview Lovable e em produção."
        breadcrumbs={[
          { label: "Administração", to: "/admin" },
          { label: "Mapa de rotas" },
        ]}
      />

      {showWildcardHint && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold">Corrigido: /admin/* não é uma página real</p>
            <p className="text-xs text-muted-foreground">
              O selector da Lovable mostra <code className="text-xs">/admin/*</code> como padrão genérico do router.
              Isso não abre nada sozinho. Use rotas reais desta lista — por exemplo <strong>/admin</strong> ou{" "}
              <strong>/admin/plans</strong>.
            </p>
            <Button size="sm" variant="outline" onClick={dismissHint}>
              Entendi
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold flex items-center gap-2">
          <Map className="h-4 w-4" />
          Preview Lovable — atalhos rápidos
        </p>
        <div className="flex flex-wrap gap-2">
          {["/", "/auth", "/panel", "/admin", "/admin/plans", "/panel/cashier"].map((p) => (
            <Button key={p} size="sm" variant="secondary" asChild>
              <Link to={p}>{p}</Link>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Rota padrão recomendada do preview: <strong>/</strong> (loja). Administração: escreva <strong>/admin</strong>{" "}
          manualmente — não use <strong>/admin/*</strong>.
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
              <RouteRow key={entry.path} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
