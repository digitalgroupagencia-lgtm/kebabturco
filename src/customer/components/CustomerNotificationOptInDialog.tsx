import { useState } from "react";
import { Bell } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { appToastSuccess, appToastError, appToastInfo } from "@/lib/appToast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  isCustomerMarketingPushSupported,
  markCustomerMarketingPromptShown,
  subscribeCustomerMarketingPush,
} from "@/lib/customerMarketingPush";

type Props = {
  open: boolean;
  storeId: string;
  onOpenChange: (open: boolean) => void;
};

const COPY = {
  pt: {
    title: "Quer receber notificações?",
    desc: "Active as notificações para acompanhar o seu pedido em tempo real e receber avisos importantes sobre a entrega.",
    activate: "Activar notificações",
    later: "Agora não",
    success: "Notificações activadas!",
    denied: "Pode activar depois nas definições do telemóvel.",
  },
  es: {
    title: "¿Quieres recibir notificaciones?",
    desc: "Activa las notificaciones para seguir tu pedido en tiempo real y recibir avisos importantes sobre tu entrega.",
    activate: "Activar notificaciones",
    later: "Ahora no",
    success: "¡Notificaciones activadas!",
    denied: "Puedes activarlas más tarde en los ajustes del móvil.",
  },
  en: {
    title: "Want to receive notifications?",
    desc: "Turn on notifications to track your order in real time and get important delivery updates.",
    activate: "Enable notifications",
    later: "Not now",
    success: "Notifications enabled!",
    denied: "You can enable them later in your phone settings.",
  },
  fr: {
    title: "Voulez-vous recevoir des notifications ?",
    desc: "Activez les notifications pour suivre votre commande en temps réel et recevoir des alertes importantes sur la livraison.",
    activate: "Activer les notifications",
    later: "Pas maintenant",
    success: "Notifications activées !",
    denied: "Vous pourrez les activer plus tard dans les réglages du téléphone.",
  },
};

const CustomerNotificationOptInDialog = ({ open, storeId, onOpenChange }: Props) => {
  const { lang } = useLanguage();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.es;
  const [busy, setBusy] = useState(false);

  const handleLater = () => {
    markCustomerMarketingPromptShown();
    onOpenChange(false);
  };

  const handleActivate = async () => {
    if (!isCustomerMarketingPushSupported()) {
      appToastInfo(copy.denied);
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      const result = await subscribeCustomerMarketingPush(storeId);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl border border-[#a64d59]/30 p-6 pt-8 shadow-2xl outline-none",
            "bg-gradient-to-b from-[#2d0a0a] to-[#1a0505] text-white",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-full p-1 text-white/70 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            onClick={handleLater}
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
            <span className="sr-only">{copy.later}</span>
          </DialogPrimitive.Close>

          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#a64d59]/60 bg-[#3d1218]/50">
              <Bell className="h-8 w-8 text-[#c97882] stroke-[1.5]" />
            </div>

            <DialogPrimitive.Title className="text-xl font-bold leading-snug text-white">
              {copy.title}
            </DialogPrimitive.Title>

            <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-white/85">
              {copy.desc}
            </DialogPrimitive.Description>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleActivate()}
              className={cn(
                "mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5",
                "border border-[#a64d59]/40 bg-gradient-to-r from-[#7f0f1e] to-[#5a0a14]",
                "text-base font-bold text-white shadow-lg transition",
                "hover:from-[#92202f] hover:to-[#6b0f18] disabled:opacity-60",
              )}
            >
              <Bell className="h-4 w-4 shrink-0" />
              {busy ? "…" : copy.activate}
            </button>

            <button
              type="button"
              onClick={handleLater}
              className="mt-4 text-sm font-medium text-white/55 transition hover:text-white/80"
            >
              {copy.later}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default CustomerNotificationOptInDialog;
