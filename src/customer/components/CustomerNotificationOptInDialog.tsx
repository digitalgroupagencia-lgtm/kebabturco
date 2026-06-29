import { useState } from "react";
import { Bell, Gift, Package, Sparkles } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { appToastSuccess, appToastError, appToastInfo } from "@/lib/appToast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
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

const CUSTOMER_COPY = {
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
  const copySet = audience === "staff" ? STAFF_COPY : CUSTOMER_COPY;
  const copy = copySet[lang as keyof typeof CUSTOMER_COPY] ?? copySet.es;
  const [busy, setBusy] = useState(false);

  const benefits = [
    { icon: Package, text: copy.benefitOrder },
    { icon: Gift, text: copy.benefitPromo },
    { icon: Sparkles, text: copy.benefitReady },
  ];

  const handleLater = () => {
    if (audience === "staff") {
      void import("@/lib/staffPush").then(({ markStaffPushPromptShown }) => markStaffPushPromptShown());
    } else {
      markCustomerMarketingPromptShown();
    }
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

      if (audience === "staff") {
        const { subscribeStaffPush, markStaffPushPromptShown } = await import("@/lib/staffPush");
        const result = await subscribeStaffPush(storeId);
        markStaffPushPromptShown();
        if (result.ok) {
          appToastSuccess(copy.success);
          onOpenChange(false);
        } else if (result.error?.includes("negada") || result.error?.includes("denied")) {
          appToastInfo(copy.denied);
          onOpenChange(false);
        } else {
          appToastError(result.error || copy.denied);
        }
        return;
      }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/75 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl border border-[#5a0a0e]/50 p-0 shadow-2xl outline-none overflow-hidden",
            "bg-gradient-to-b from-[#3a0205] via-[#2a0104] to-[#1a0204] text-white",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="relative px-6 pt-8 pb-6">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#6b1015]/30 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-6 bottom-12 h-24 w-24 rounded-full bg-[#8b1a20]/20 blur-xl"
              aria-hidden
            />

            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              onClick={handleLater}
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
              <span className="sr-only">{copy.later}</span>
            </DialogPrimitive.Close>

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                <Bell className="h-9 w-9 text-white stroke-[1.5]" />
              </div>

              <DialogPrimitive.Title className="text-[1.35rem] font-bold leading-snug tracking-tight text-white">
                {copy.title}
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-white/75">
                {copy.subtitle}
              </DialogPrimitive.Description>

              <ul className="mt-5 w-full space-y-2.5 text-left">
                {benefits.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5a0a0e]/60">
                      <Icon className="h-4 w-4 text-white/90" strokeWidth={1.75} />
                    </span>
                    <span className="text-sm font-medium leading-snug text-white/90">{text}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={busy || !storeId}
                onClick={() => void handleActivate()}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4",
                  "bg-white text-[#3a0205]",
                  "text-base font-bold shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition",
                  "hover:bg-white/95 active:scale-[0.98] disabled:opacity-60",
                )}
              >
                <Bell className="h-4 w-4 shrink-0" />
                {busy ? "…" : copy.activate}
              </button>

              <button
                type="button"
                onClick={handleLater}
                className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white/55 transition hover:text-white/85"
              >
                {copy.later}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default CustomerNotificationOptInDialog;
