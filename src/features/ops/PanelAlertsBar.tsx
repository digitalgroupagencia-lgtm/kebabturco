import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  enablePanelAlerts,
  getLastAlertDiagnostic,
  isIOSPanelDevice,
  isPanelAlertsEnabled,
  PANEL_ALERT_FLASH_EVENT,
  playTestAlert,
  setPanelAlertsEnabled,
} from "@/lib/panelAlerts";

const PanelAlertsBar = () => {
  const [enabled, setEnabled] = useState(isPanelAlertsEnabled);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [diag, setDiag] = useState(getLastAlertDiagnostic);

  useEffect(() => {
    const onFlash = () => {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 350);
    };
    window.addEventListener(PANEL_ALERT_FLASH_EVENT, onFlash);
    return () => window.removeEventListener(PANEL_ALERT_FLASH_EVENT, onFlash);
  }, []);

  const refreshDiag = () => setDiag(getLastAlertDiagnostic());

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await enablePanelAlerts();
      setEnabled(isPanelAlertsEnabled());
      refreshDiag();
      if (ok) {
        toast.success(
          isIOSPanelDevice()
            ? "Ouve o bip agora? Se não, desactiva o modo silencioso (interruptor lateral)."
            : "Alertas activos — bip a cada 2s enquanto houver pedido por aceitar",
        );
      } else {
        toast.warning(
          isIOSPanelDevice()
            ? "Sem som — desactiva o interruptor silencioso do iPhone e tenta outra vez"
            : "Não foi possível activar o som. Toca outra vez.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = () => {
    setPanelAlertsEnabled(false);
    setEnabled(false);
    toast.info("Alertas de som desactivados (vibração e flash mantêm-se)");
  };

  const handleTest = async () => {
    if (!enabled) {
      await handleEnable();
      return;
    }
    const heard = await playTestAlert();
    refreshDiag();
    if (heard) {
      toast.success(
        isIOSPanelDevice()
          ? "Bip enviado — ouviu? Também deve sentir vibração e flash no ecrã."
          : "Som de teste OK",
      );
    } else {
      toast.warning(
        isIOSPanelDevice()
          ? "Sem som — modo silencioso desligado? Volume alto? Tente no Safari (não atalho antigo)."
          : "Sem som — verifica volume",
      );
    }
  };

  const diagLine =
    diag && isIOSPanelDevice()
      ? diag.ok
        ? "Último bip: enviado ao altifalante"
        : `Último bip: falhou (${diag.error || "erro"})`
      : null;

  if (!enabled) {
    return (
      <div
        className={`rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 transition-colors ${flash ? "bg-amber-400/40" : ""}`}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <BellOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">Activar alertas de pedidos</p>
            <p className="text-xs text-muted-foreground">
              No iPhone toca aqui. Desactiva o modo silencioso (interruptor lateral). Bip + vibração + flash no ecrã.
            </p>
            {diagLine && <p className="text-[10px] text-muted-foreground mt-1">{diagLine}</p>}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-10 font-bold touch-action-manipulation"
          onClick={handleEnable}
          disabled={busy}
        >
          <Bell className="w-4 h-4 mr-1.5" />
          Activar alertas
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-success/40 bg-success/5 px-3 py-2 flex flex-col gap-1 transition-colors ${flash ? "bg-amber-400/50 border-amber-500" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-bold text-success">
          <Bell className="w-4 h-4" />
          Alertas activos · bip + vibração + flash
        </span>
        <div className="flex gap-1.5 shrink-0">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleTest}>
            <Volume2 className="w-3.5 h-3.5 mr-1" />
            Testar som
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={handleDisable}>
            Desactivar
          </Button>
        </div>
      </div>
      {diagLine && <p className="text-[10px] text-muted-foreground px-0.5">{diagLine}</p>}
    </div>
  );
};

export default PanelAlertsBar;
