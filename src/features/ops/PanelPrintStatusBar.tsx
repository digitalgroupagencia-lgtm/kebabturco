import { useState } from "react";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PrintQueueSummary } from "./usePanelPrintStatus";

interface PanelPrintStatusBarProps {
  summary: PrintQueueSummary | null;
  loading: boolean;
  onRetryFailed?: () => Promise<number>;
  onClearJobs?: (statuses: string[]) => Promise<number>;
  onRefresh?: () => void;
}

/**
 * Painel do restaurante: NÃO mostra diagnóstico de impressão/bridge.
 * Esse diagnóstico vive apenas no Admin Master.
 * Aqui só aparece um alerta discreto quando há pedidos reais que falharam a imprimir,
 * para o operador saber que precisa reimprimir manualmente.
 */
const PanelPrintStatusBar = ({ summary, loading, onRetryFailed, onRefresh }: PanelPrintStatusBarProps) => {
  const [retrying, setRetrying] = useState(false);

  if (loading || !summary?.printerEnabled) return null;
  if (!summary.failed || summary.failed <= 0) return null;

  const handleRetry = async () => {
    if (!onRetryFailed) return;
    setRetrying(true);
    try {
      const count = await onRetryFailed();
      toast[count > 0 ? "success" : "info"](
        count > 0 ? `${count} pedido(s) reenviado(s) para impressão` : "Nenhum pedido para reenviar",
      );
      onRefresh?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao reenviar");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      <AlertTriangle className="w-4 h-4 text-destructive" />
      <span className="font-semibold text-destructive">
        {summary.failed} pedido(s) não foram impressos
      </span>
      <span className="text-muted-foreground">— verifica a impressora ou reimprime abaixo.</span>
      {onRetryFailed && (
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs ml-auto"
          disabled={retrying}
          onClick={() => void handleRetry()}
        >
          {retrying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
          Reimprimir
        </Button>
      )}
    </div>
  );
};

export default PanelPrintStatusBar;
