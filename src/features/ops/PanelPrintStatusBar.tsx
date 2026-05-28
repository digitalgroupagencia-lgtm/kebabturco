import { useState } from "react";
import { Loader2, Printer, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PrintQueueSummary } from "./usePanelPrintStatus";

interface PanelPrintStatusBarProps {
  summary: PrintQueueSummary | null;
  loading: boolean;
  onRetryFailed?: () => Promise<number>;
  onRefresh?: () => void;
}

const PanelPrintStatusBar = ({ summary, loading, onRetryFailed, onRefresh }: PanelPrintStatusBarProps) => {
  const [retrying, setRetrying] = useState(false);

  if (loading && !summary) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Impressão...
      </p>
    );
  }

  if (!summary?.printerEnabled) return null;

  const hasProblem = summary.pending > 0 || summary.failed > 0 || summary.bridge === "inactive";
  const lastLabel = summary.lastPrintedAt
    ? new Date(summary.lastPrintedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const bridgeLabel = summary.bridgeLastSeen
    ? new Date(summary.bridgeLastSeen).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const handleRetry = async () => {
    if (!onRetryFailed) return;
    setRetrying(true);
    try {
      const count = await onRetryFailed();
      if (count > 0) {
        toast.success(`${count} job(s) reenviado(s) para a fila`);
      } else {
        toast.info("Nenhum job falhado para reenviar");
      }
      onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reenviar jobs");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      className={`rounded-xl border px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${
        hasProblem ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"
      }`}
    >
      <span className="flex items-center gap-1.5 font-bold">
        <Printer className="w-3.5 h-3.5" />
        Impressão
      </span>
      {summary.bridge === "active" ? (
        <span className="flex items-center gap-1 text-success font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Bridge activo
        </span>
      ) : summary.bridge === "inactive" ? (
        <span className="flex items-center gap-1 text-destructive font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" /> Bridge offline — jobs na fila
        </span>
      ) : (
        <span className="text-muted-foreground">Bridge —</span>
      )}
      {bridgeLabel && (
        <span className="text-muted-foreground">Último sinal: {bridgeLabel}</span>
      )}
      {summary.pending > 0 && (
        <span className="font-bold text-amber-700 dark:text-amber-400">{summary.pending} na fila</span>
      )}
      {summary.failed > 0 && (
        <span className="font-bold text-destructive">{summary.failed} falhou</span>
      )}
      {summary.failed > 0 && onRetryFailed && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={retrying}
          onClick={() => void handleRetry()}
        >
          {retrying ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RotateCcw className="w-3 h-3 mr-1" />
          )}
          Reenviar falhados
        </Button>
      )}
      <span className="text-muted-foreground ml-auto">Última impressão: {lastLabel}</span>
    </div>
  );
};

export default PanelPrintStatusBar;
