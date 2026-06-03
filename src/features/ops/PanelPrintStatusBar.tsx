import { useState } from "react";
import { Loader2, Printer, AlertTriangle, CheckCircle2, RotateCcw, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PrintQueueSummary } from "./usePanelPrintStatus";

interface PanelPrintStatusBarProps {
  summary: PrintQueueSummary | null;
  loading: boolean;
  onRetryFailed?: () => Promise<number>;
  onClearJobs?: (statuses: string[]) => Promise<number>;
  onRefresh?: () => void;
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

const PanelPrintStatusBar = ({ summary, loading, onRetryFailed, onClearJobs, onRefresh }: PanelPrintStatusBarProps) => {
  const [retrying, setRetrying] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (loading && !summary) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Impressão...
      </p>
    );
  }

  if (!summary?.printerEnabled) return null;

  const hasProblem = summary.pending > 0 || summary.failed > 0 || summary.bridge === "inactive";

  const handleRetry = async () => {
    if (!onRetryFailed) return;
    setRetrying(true);
    try {
      const count = await onRetryFailed();
      toast[count > 0 ? "success" : "info"](
        count > 0 ? `${count} job(s) reenviado(s)` : "Nenhum job falhado para reenviar",
      );
      onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reenviar jobs");
    } finally {
      setRetrying(false);
    }
  };

  const handleClear = async (statuses: string[], label: string) => {
    if (!onClearJobs) return;
    if (!confirm(`Limpar todos os jobs de impressão com status: ${label}?`)) return;
    setClearing(label);
    try {
      const count = await onClearJobs(statuses);
      toast.success(`${count} job(s) removido(s)`);
      onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar jobs");
    } finally {
      setClearing(null);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border text-xs",
        hasProblem ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card",
      )}
    >
      <div className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 font-bold">
          <Printer className="w-3.5 h-3.5" />
          Impressão
        </span>
        {summary.bridge === "active" ? (
          <span className="flex items-center gap-1 text-success font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Bridge online
          </span>
        ) : summary.bridge === "inactive" ? (
          <span className="flex items-center gap-1 text-destructive font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" /> Bridge offline
          </span>
        ) : (
          <span className="text-muted-foreground">Bridge —</span>
        )}
        <span className="text-muted-foreground">Último sinal: {fmtTime(summary.bridgeLastSeen)}</span>
        {summary.pending > 0 && (
          <span className="font-bold text-amber-700 dark:text-amber-400">{summary.pending} na fila</span>
        )}
        {summary.failed > 0 && (
          <span className="font-bold text-destructive">{summary.failed} falhou</span>
        )}
        <span className="text-muted-foreground ml-auto">Última impressão: {fmtTime(summary.lastPrintedAt)}</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold"
        >
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
          Detalhes
        </button>
      </div>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-2 bg-background/40">
          {summary.bridgeReason && (
            <div className="text-[11px] text-amber-700 dark:text-amber-400">
              <strong>Motivo:</strong> {summary.bridgeReason}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md border px-2 py-1.5">
              <div className="font-semibold mb-0.5">Último job impresso</div>
              {summary.lastPrintedJob ? (
                <div className="text-muted-foreground">
                  Job <code>{summary.lastPrintedJob.id.slice(0, 8)}</code> · {fmtTime(summary.lastPrintedJob.updated_at)}
                </div>
              ) : (
                <div className="text-muted-foreground">Nunca</div>
              )}
            </div>
            <div className="rounded-md border px-2 py-1.5">
              <div className="font-semibold mb-0.5">Último job pendente</div>
              {summary.oldestPendingJob ? (
                <div className="text-muted-foreground">
                  Job <code>{summary.oldestPendingJob.id.slice(0, 8)}</code> · criado {fmtTime(summary.oldestPendingJob.created_at)}
                </div>
              ) : (
                <div className="text-muted-foreground">Nenhum</div>
              )}
            </div>
            <div className="rounded-md border px-2 py-1.5 sm:col-span-2">
              <div className="font-semibold mb-0.5">Último erro</div>
              {summary.lastFailedJob ? (
                <div className="text-muted-foreground">
                  <div>Job <code>{summary.lastFailedJob.id.slice(0, 8)}</code> · {fmtTime(summary.lastFailedJob.updated_at)}</div>
                  <div className="mt-1 text-destructive font-mono">{summary.lastFailedJob.error_message ?? "(sem mensagem)"}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">Nenhum erro registado</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {summary.failed > 0 && onRetryFailed && (
              <Button variant="default" size="sm" className="h-7 text-xs" disabled={retrying} onClick={() => void handleRetry()}>
                {retrying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                Reenviar falhados
              </Button>
            )}
            {onClearJobs && summary.failed > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={clearing !== null}
                onClick={() => void handleClear(["failed"], "falhados")}
              >
                {clearing === "falhados" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Limpar falhados
              </Button>
            )}
            {onClearJobs && summary.pending > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={clearing !== null}
                onClick={() => void handleClear(["pending"], "pendentes")}
              >
                {clearing === "pendentes" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Limpar pendentes
              </Button>
            )}
            {onClearJobs && (summary.pending > 0 || summary.failed > 0) && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                disabled={clearing !== null}
                onClick={() => void handleClear(["pending", "failed", "printing"], "toda a fila")}
              >
                {clearing === "toda a fila" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Limpar fila
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelPrintStatusBar;
