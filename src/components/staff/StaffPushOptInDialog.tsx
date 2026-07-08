import { useState } from "react";
import { appToastSuccess, appToastError, appToastInfo } from "@/lib/appToast";
import { useOptionalLanguage } from "@/contexts/LanguageContext";
import PushOptInDialogFrame, { type PushOptInCopy } from "@/components/push/PushOptInDialogFrame";
import {
  subscribeStaffPush,
} from "@/lib/staffPush";
import { initNativePushBridge } from "@/services/nativePush";

type Props = {
  open: boolean;
  storeId: string;
  onOpenChange: (open: boolean) => void;
};

const STAFF_COPY: Record<string, PushOptInCopy> = {
  pt: {
    title: "Não perca pedidos novos",
    subtitle: "Active as notificações para saber quando chega um pedido.",
    benefitOrder: "Alertas de pedidos em tempo real",
    benefitPromo: "Avisos da equipa e operações",
    benefitReady: "Funciona com a app fechada",
    activate: "Activar notificações",
    later: "Agora não",
  },
  es: {
    title: "No te pierdas ningún pedido",
    subtitle: "Activa las notificaciones para saber cuando llega un pedido.",
    benefitOrder: "Alertas de pedidos en tiempo real",
    benefitPromo: "Avisos del equipo y operaciones",
    benefitReady: "Funciona con la app cerrada",
    activate: "Activar notificaciones",
    later: "Ahora no",
  },
  en: {
    title: "Don't miss new orders",
    subtitle: "Turn on notifications to know when orders arrive.",
    benefitOrder: "Real-time order alerts",
    benefitPromo: "Team and operations notices",
    benefitReady: "Works with the app closed",
    activate: "Enable notifications",
    later: "Not now",
  },
  fr: {
    title: "Ne manquez aucune commande",
    subtitle: "Activez les notifications pour savoir quand une commande arrive.",
    benefitOrder: "Alertes de commandes en temps réel",
    benefitPromo: "Avis d'équipe et opérations",
    benefitReady: "Fonctionne avec l'app fermée",
    activate: "Activer les notifications",
    later: "Pas maintenant",
  },
};

const StaffPushOptInDialog = ({ open, storeId, onOpenChange }: Props) => {
  const lang = useOptionalLanguage()?.lang ?? "es";
  const copy = STAFF_COPY[lang] ?? STAFF_COPY.es;
  const [busy, setBusy] = useState(false);

  const handleLater = () => {
    onOpenChange(false);
  };

  const handleActivate = async () => {
    if (!storeId) {
      appToastError("Pode activar depois nas definições do telemóvel.");
      return;
    }
    setBusy(true);
    try {
      await initNativePushBridge();
      const result = await subscribeStaffPush(storeId);
      if (result.ok) {
        appToastSuccess("Notificações activadas!");
        onOpenChange(false);
      } else if (result.error?.includes("negada") || result.error?.includes("denied")) {
        appToastInfo("Pode activar depois nas definições do telemóvel.");
        onOpenChange(false);
      } else {
        appToastError(result.error || "Não foi possível activar as notificações.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PushOptInDialogFrame
      open={open}
      storeId={storeId}
      busy={busy}
      copy={copy}
      onOpenChange={onOpenChange}
      onActivate={() => void handleActivate()}
      onLater={handleLater}
    />
  );
};

export default StaffPushOptInDialog;
