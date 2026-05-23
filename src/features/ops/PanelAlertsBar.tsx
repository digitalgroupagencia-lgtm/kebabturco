import { useState } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  enablePanelAlerts,
  isPanelAlertsEnabled,
  playTestAlert,
  setPanelAlertsEnabled,
} from "@/lib/panelAlerts";

const PanelAlertsBar = () => {
  const [enabled, setEnabled] = useState(isPanelAlertsEnabled);
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await enablePanelAlerts();
      setEnabled(ok);
      if (ok) {
        const heard = await playTestAlert();
        if (heard) {
          toast.success("Alertas activos — bip a cada 2s enquanto houver pedido por aceitar");
        } else {
          toast.warning("Alertas activos — se não ouvir, desactiva modo silencioso do iPhone");
        }
      } else {
        toast.error("Não foi possível activar o som. Toca outra vez.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = () => {
    setPanelAlertsEnabled(false);
    setEnabled(false);
    toast.info("Alertas de som desactivados (vibração mantém-se)");
  };

  const handleTest = async () => {
    if (!enabled) {
      await handleEnable();
      return;
    }
    const heard = await playTestAlert();
    if (heard) {
      toast.success("Som de teste OK");
    } else {
      toast.warning("Sem som — verifica volume e modo silencioso do telemóvel");
      setEnabled(false);
      setPanelAlertsEnabled(false);
    }
  };

  if (!enabled) {
    return (
      <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <BellOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">Activar alertas de pedidos</p>
            <p className="text-xs text-muted-foreground">
              No telemóvel toca aqui uma vez. O bip repete de 2 em 2 segundos até aceitares o pedido.
            </p>
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
    <div className="rounded-xl border border-success/40 bg-success/5 px-3 py-2 flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-xs font-bold text-success">
        <Bell className="w-4 h-4" />
        Alertas activos · bip de 2 em 2s
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
  );
};

export default PanelAlertsBar;
