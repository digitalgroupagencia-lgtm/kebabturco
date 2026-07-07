/**
 * Badge de versão só para admin_master.
 * Compara a versão a correr no telemóvel com a versão publicada (/version.json).
 * Mostra em linguagem simples: "Atualizado" ou "Versão antiga — atualizar".
 */
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isGeneralAdmin } from "@/lib/roles";

const GIT_SHA = typeof __GIT_SHA__ !== "undefined" ? __GIT_SHA__ : "dev";
const BUILD_ID = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "local";

type ServerVersion = { buildId?: string; gitSha?: string; builtAt?: string };

function formatBuildDate(id: string): string {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1_000_000_000_000) return id;
  try {
    return new Date(n).toLocaleString();
  } catch {
    return id;
  }
}

export default function BuildVersionBadge() {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const [server, setServer] = useState<ServerVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isMaster = isGeneralAdmin(roleData?.role);

  const fetchServer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setServer(await res.json());
    } catch {
      setServer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMaster) void fetchServer();
  }, [isMaster]);

  if (!isMaster) return null;

  const upToDate = server && (server.gitSha === GIT_SHA || server.buildId === BUILD_ID);
  const status = !server ? "unknown" : upToDate ? "ok" : "stale";

  const chipClass =
    status === "ok"
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : status === "stale"
        ? "border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-300"
        : "border-border/60 bg-muted/60 text-muted-foreground";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${chipClass}`}
        title="Toca para ver detalhes"
      >
        {status === "ok" && <CheckCircle2 className="h-3.5 w-3.5" />}
        {status === "stale" && <AlertTriangle className="h-3.5 w-3.5" />}
        <span>
          {status === "ok" && "App atualizado"}
          {status === "stale" && "Versão antiga — atualizar"}
          {status === "unknown" && `v:${GIT_SHA}`}
        </span>
      </button>

      {expanded && (
        <div className={`rounded-lg border p-2.5 text-[11px] leading-relaxed ${chipClass}`}>
          <div className="font-semibold mb-1.5 flex items-center justify-between">
            <span>Versão do app</span>
            <button
              type="button"
              onClick={fetchServer}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] hover:bg-background"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Verificar
            </button>
          </div>

          <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px]">
            <span className="opacity-70">No telemóvel:</span>
            <span>{GIT_SHA} · {formatBuildDate(BUILD_ID)}</span>
            <span className="opacity-70">No servidor:</span>
            <span>
              {server
                ? `${server.gitSha ?? "?"} · ${server.builtAt ? new Date(server.builtAt).toLocaleString() : formatBuildDate(server.buildId ?? "?")}`
                : "não foi possível ler"}
            </span>
          </div>

          {status === "stale" && (
            <p className="mt-2 text-[10px] leading-snug">
              O app está a mostrar uma versão antiga.
              <br />
              <strong>Feche totalmente o app e reabra.</strong> Se continuar, limpe o cache do app nas definições do telemóvel.
            </p>
          )}
          {status === "ok" && (
            <p className="mt-2 text-[10px] leading-snug">Está a correr a versão mais recente publicada.</p>
          )}
        </div>
      )}
    </div>
  );
}
