import { Loader2, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PrintQueueSummary } from "./usePanelPrintStatus";

interface PanelPrintStatusBarProps {
  summary: PrintQueueSummary | null;
  loading: boolean;
}

const PanelPrintStatusBar = ({ summary, loading }: PanelPrintStatusBarProps) => {
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
      {summary.pending > 0 && (
        <span className="font-bold text-amber-700 dark:text-amber-400">{summary.pending} na fila</span>
      )}
      {summary.failed > 0 && (
        <span className="font-bold text-destructive">{summary.failed} falhou</span>
      )}
      <span className="text-muted-foreground ml-auto">Última: {lastLabel}</span>
    </div>
  );
};

export default PanelPrintStatusBar;
