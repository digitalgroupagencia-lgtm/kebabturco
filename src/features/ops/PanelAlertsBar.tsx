import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  countUnacknowledgedPendingOrders,
  enablePanelAlerts,
  getLastAlertDiagnostic,
  isIOSPanelDevice,
  isPanelAlertsEnabled,
  PANEL_ALERTS_CHANGED_EVENT,
  PANEL_ALERT_FLASH_EVENT,
  PANEL_UNACK_CHANGED_EVENT,
  playTestAlert,
  setPanelAlertsEnabled,
  silenceAllPendingAlerts,
} from "@/lib/panelAlerts";
import { isStaffPushSupported, subscribeStaffPush } from "@/lib/staffPush";

type Props = {
  storeId?: string;
};

const PanelAlertsBar = ({ storeId }: Props) => {
  const [enabled, setEnabled] = useState(isPanelAlertsEnabled);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [diag, setDiag] = useState(getLastAlertDiagnostic);
  const [unackCount, setUnackCount] = useState(countUnacknowledgedPendingOrders);

  useEffect(() => {
    const onFlash = () => {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 350);
    };
    const onAlertsChanged = () => setEnabled(isPanelAlertsEnabled());
    window.addEventListener(PANEL_ALERT_FLASH_EVENT, onFlash);
    window.addEventListener(PANEL_ALERTS_CHANGED_EVENT, onAlertsChanged);
    return () => {
      window.removeEventListener(PANEL_ALERT_FLASH_EVENT, onFlash);
      window.removeEventListener(PANEL_ALERTS_CHANGED_EVENT, onAlertsChanged);
    };
  }, []);

  useEffect(() => {
    const sync = () => setUnackCount(countUnacknowledgedPendingOrders());
    window.addEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
  }, []);

  const refreshDiag = () => setDiag(getLastAlertDiagnostic());

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await enablePanelAlerts();
      const nowEnabled = isPanelAlertsEnabled();
      setEnabled(nowEnabled);
      refreshDiag();
      if (storeId && isStaffPushSupported()) {
        const push = await subscribeStaffPush(storeId);
        if (push.ok) {
          toast.success("Push activo para novos pedidos neste dispositivo", { duration: 3000 });
        }
      }
      const lastDiag = getLastAlertDiagnostic();
      if (nowEnabled && ok) {
        toast.success(
          isIOSPanelDevice()
            ? lastDiag?.ok
              ? "Alertas activos — bip curto quando chega pedido novo."
              : "Alertas activos — flash e vibração suave por pedido novo."
            : "Alertas activos — bip curto só quando chega pedido novo",
        );
      } else {
        toast.warning("Não foi possível activar. Toca outra vez.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = () => {
    silenceAllPendingAlerts();
    setPanelAlertsEnabled(false);
    setEnabled(false);
    setUnackCount(0);
    toast.info("Alertas desactivados");
  };

  const handleSilence = () => {
    silenceAllPendingAlerts();
    setUnackCount(0);
    toast.success("Alertas silenciados — pedidos novos já vistos");
  };

  const handleTest = async () => {
    if (!enabled) {
      await handleEnable();
      return;
    }
    const heard = await playTestAlert();
    refreshDiag();
    if (heard) {
      toast.success(isIOSPanelDevice() ? "Teste OK — bip curto." : "Som de teste OK");
    } else if (isIOSPanelDevice()) {
      toast.success("Teste enviado — flash activo. Som pode variar no iPhone.");
    } else {
      toast.warning("Sem som — verifica volume");
    }
  };

  const diagLine =
    diag && isIOSPanelDevice()
      ? diag.ok
        ? "Último aviso: som enviado"
        : "Último aviso: flash + vibração (sem som confirmado)"
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
              Um bip curto por pedido novo em «Recebido». Para ao aceitar ou abrir o pedido — sem repetição.
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-2 text-xs font-bold text-success">
          <Bell className="w-4 h-4" />
          Alertas activos · bip único por pedido novo
          {unackCount > 0 && (
            <span className="rounded-full bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 min-w-[18px] text-center">
              {unackCount}
            </span>
          )}
        </span>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {unackCount > 0 && (
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs font-bold" onClick={handleSilence}>
              <VolumeX className="w-3.5 h-3.5 mr-1" />
              Silenciar alertas
            </Button>
          )}
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
