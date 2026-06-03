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
import { isStaffPushSupported, subscribeStaffPush, setStaffPushEnabled } from "@/lib/staffPush";

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
              ? "Alertas activos — som repete até mudar o estado do pedido."
              : "Alertas activos — flash e vibração até mudar o estado."
            : "Alertas activos — som repete até mudar o estado do pedido",
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
    setStaffPushEnabled(false);
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
        className={`rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 flex items-center gap-2 transition-colors ${flash ? "bg-amber-400/40" : ""}`}
      >
        <BellOff className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs font-bold text-foreground flex-1 min-w-0 truncate">Activar alertas de pedidos</p>
        <Button
          type="button"
          size="sm"
          className="shrink-0 h-7 px-2 text-xs font-bold"
          onClick={handleEnable}
          disabled={busy}
        >
          <Bell className="w-3.5 h-3.5 mr-1" />
          Activar
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-success/40 bg-success/5 px-2 py-1 flex items-center justify-between gap-2 transition-colors ${flash ? "bg-amber-400/50 border-amber-500" : ""}`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-success min-w-0 truncate">
        <Bell className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Alertas activos</span>
        {unackCount > 0 && (
          <span className="rounded-full bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 min-w-[18px] text-center shrink-0">
            {unackCount}
          </span>
        )}
      </span>
      <div className="flex gap-1 shrink-0">
        {unackCount > 0 && (
          <Button type="button" variant="secondary" size="sm" className="h-7 px-2 text-[11px] font-bold" onClick={handleSilence}>
            <VolumeX className="w-3 h-3 mr-1" />
            Silenciar
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={handleTest}>
          <Volume2 className="w-3 h-3" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground" onClick={handleDisable}>
          ✕
        </Button>
      </div>
    </div>
  );
};

export default PanelAlertsBar;
