import { useState } from "react";
import { appToastSuccess, appToastError, appToastInfo } from "@/lib/appToast";
import { useLanguage } from "@/contexts/LanguageContext";
import PushOptInDialogFrame, { type PushOptInCopy } from "@/components/push/PushOptInDialogFrame";
import {
  isCustomerMarketingPushSupportedAsync,
  markCustomerMarketingPromptShown,
  subscribeCustomerMarketingPush,
} from "@/lib/customerMarketingPush";
import { initNativePushBridge } from "@/services/nativePush";

type Props = {
  open: boolean;
  storeId: string;
  onOpenChange: (open: boolean) => void;
  audience?: "customer" | "staff";
};

const CUSTOMER_COPY: Record<string, PushOptInCopy & { success: string; denied: string }> = {
  pt: {
    title: "Fique a par dos seus pedidos",
    subtitle: "Active as notificações e não perca nada importante.",
    benefitOrder: "Estado do pedido em tempo real",
    benefitPromo: "Promoções e ofertas exclusivas",
    benefitReady: "Aviso quando estiver pronto para recolher",
    activate: "Activar notificações",
    later: "Não, obrigado",
    success: "Notificações activadas!",
    denied: "Pode activar depois nas definições do telemóvel.",
  },
  es: {
    title: "No te pierdas tu pedido",
    subtitle: "Activa las notificaciones y entérate al momento.",
    benefitOrder: "Estado del pedido en tiempo real",
    benefitPromo: "Promociones y ofertas exclusivas",
    benefitReady: "Aviso cuando esté listo para recoger",
    activate: "Activar notificaciones",
    later: "No, gracias",
    success: "¡Notificaciones activadas!",
    denied: "Puedes activarlas más tarde en los ajustes del móvil.",
  },
  en: {
    title: "Stay on top of your order",
    subtitle: "Turn on notifications so you never miss an update.",
    benefitOrder: "Real-time order status",
    benefitPromo: "Exclusive deals and promotions",
    benefitReady: "Alert when ready for pickup",
    activate: "Enable notifications",
    later: "No thanks",
    success: "Notifications enabled!",
    denied: "You can enable them later in your phone settings.",
  },
  fr: {
    title: "Suivez votre commande",
    subtitle: "Activez les notifications pour ne rien manquer.",
    benefitOrder: "Statut de commande en temps réel",
    benefitPromo: "Promotions et offres exclusives",
    benefitReady: "Alerte quand c'est prêt à récupérer",
    activate: "Activer les notifications",
    later: "Non merci",
    success: "Notifications activées !",
    denied: "Vous pourrez les activer plus tard dans les réglages du téléphone.",
  },
};

const STAFF_COPY = {
  pt: {
    title: "Não perca pedidos novos",
    subtitle: "Active as notificações para saber quando chega um pedido.",
    benefitOrder: "Alertas de pedidos em tempo real",
    benefitPromo: "Avisos da equipa e operações",
    benefitReady: "Funciona com a app fechada",
    activate: "Activar notificações",
    later: "Agora não",
    success: "Notificações activadas!",
    denied: "Pode activar depois nas definições do telemóvel.",
  },
  es: {
    title: "No te pierdas ningún pedido",
    subtitle: "Activa las notificaciones para saber cuando llega un pedido.",
    benefitOrder: "Alertas de pedidos en tiempo real",
    benefitPromo: "Avisos del equipo y operaciones",
    benefitReady: "Funciona con la app cerrada",
    activate: "Activar notificaciones",
    later: "Ahora no",
    success: "¡Notificaciones activadas!",
    denied: "Puedes activarlas más tarde en los ajustes del móvil.",
  },
  en: {
    title: "Don't miss new orders",
    subtitle: "Turn on notifications to know when orders arrive.",
    benefitOrder: "Real-time order alerts",
    benefitPromo: "Team and operations notices",
    benefitReady: "Works with the app closed",
    activate: "Enable notifications",
    later: "Not now",
    success: "Notifications enabled!",
    denied: "You can enable them later in your phone settings.",
  },
  fr: {
    title: "Ne manquez aucune commande",
    subtitle: "Activez les notifications pour savoir quand une commande arrive.",
    benefitOrder: "Alertes de commandes en temps réel",
    benefitPromo: "Avis d'équipe et opérations",
    benefitReady: "Fonctionne avec l'app fermée",
    activate: "Activer les notifications",
    later: "Pas maintenant",
    success: "Notifications activées !",
    denied: "Vous pourrez les activer plus tard dans les réglages du téléphone.",
  },
};

const CustomerNotificationOptInDialog = ({
  open,
  storeId,
  onOpenChange,
  audience = "customer",
}: Props) => {
  const { lang } = useLanguage();
  const copy = CUSTOMER_COPY[lang] ?? CUSTOMER_COPY.es;
  const [busy, setBusy] = useState(false);

  const handleLater = () => {
    if (audience === "staff") markStaffPushPromptShown();
    else markCustomerMarketingPromptShown();
    onOpenChange(false);
  };

  const handleActivate = async () => {
    if (!storeId) {
      appToastError(copy.denied);
      return;
    }
    setBusy(true);
    try {
      await initNativePushBridge();

      const supported = await isCustomerMarketingPushSupportedAsync();
      if (!supported) {
        appToastInfo(copy.denied);
        return;
      }

      const result = await subscribeCustomerMarketingPush(storeId);
      markCustomerMarketingPromptShown();
      if (result.ok) {
        appToastSuccess(copy.success);
        onOpenChange(false);
      } else if (result.error?.includes("negada") || result.error?.includes("denied")) {
        appToastInfo(copy.denied);
        onOpenChange(false);
      } else {
        appToastError(result.error || copy.denied);
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

export default CustomerNotificationOptInDialog;
