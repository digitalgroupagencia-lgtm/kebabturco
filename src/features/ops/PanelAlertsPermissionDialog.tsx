import { useState } from "react";
import { Bell, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enablePanelAlerts, isPanelAlertsEnabled } from "@/lib/panelAlerts";
import { isStaffPushSupported, subscribeStaffPush } from "@/lib/staffPush";

type Props = {
  open: boolean;
  storeId: string;
  onOpenChange: (open: boolean) => void;
  onEnabled?: () => void;
};

const PanelAlertsPermissionDialog = ({ open, storeId, onOpenChange, onEnabled }: Props) => {
  const [busy, setBusy] = useState(false);

  const handleActivate = async () => {
    setBusy(true);
    try {
      const soundOk = await enablePanelAlerts();
      let pushOk = false;
      if (isStaffPushSupported()) {
        const push = await subscribeStaffPush(storeId);
        pushOk = push.ok;
        if (!push.ok && push.error && push.error !== "Permissão de notificações negada") {
          console.warn("[PanelAlertsPermissionDialog]", push.error);
        }
      }

      if (isPanelAlertsEnabled()) {
        toast.success(
          pushOk
            ? "Som e notificações activos — o alerta repete até mudar o estado do pedido."
            : "Som activo — o alerta repete até mudar o estado do pedido.",
        );
        onEnabled?.();
        onOpenChange(false);
      } else if (soundOk) {
        onEnabled?.();
        onOpenChange(false);
      } else {
        toast.warning("Não foi possível activar o som. Tente outra vez.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Activar alertas de pedidos
          </DialogTitle>
          <DialogDescription className="text-left space-y-2 pt-1">
            <span className="block">
              Para não perder pedidos novos, active o <strong>som</strong> e as{" "}
              <strong>notificações</strong> neste dispositivo.
            </span>
            <span className="block text-muted-foreground">
              O som repete automaticamente enquanto houver pedidos em «Recebido», até a equipa mudar o
              estado (aceitar, preparar, etc.).
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button type="button" className="w-full font-bold h-11" disabled={busy} onClick={handleActivate}>
            <Volume2 className="w-4 h-4 mr-2" />
            Activar som e notificações
          </Button>
          <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PanelAlertsPermissionDialog;
