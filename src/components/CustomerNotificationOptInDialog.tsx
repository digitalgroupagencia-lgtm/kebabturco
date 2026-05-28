import { useState } from "react";
import { Bell } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
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
    title: "Receber novidades?",
    desc: "Activar notificações para saber quando o seu pedido estiver pronto e receber ofertas como «Que tal um kebab hoje?» — mesmo antes de encomendar.",
    activate: "Activar notificações",
    later: "Agora não",
    success: "Notificações activadas!",
    denied: "Pode activar depois nas definições do telemóvel.",
  },
  es: {
    title: "¿Recibir novedades?",
    desc: "Activa las notificaciones para saber cuándo está listo tu pedido y recibir ofertas como «¿Qué tal un kebab hoy?» — incluso antes de pedir.",
    activate: "Activar notificaciones",
    later: "Ahora no",
    success: "¡Notificaciones activadas!",
    denied: "Puedes activarlas más tarde en los ajustes del móvil.",
  },
  en: {
    title: "Get updates?",
    desc: "Enable notifications to know when your order is ready and get offers like «Fancy a kebab today?» — even before you order.",
    activate: "Enable notifications",
    later: "Not now",
    success: "Notifications enabled!",
    denied: "You can enable them later in your phone settings.",
  },
};

const CustomerNotificationOptInDialog = ({ open, storeId, onOpenChange }: Props) => {
  const { lang } = useLanguage();
  const copy = COPY[lang] ?? COPY.es;
  const [busy, setBusy] = useState(false);

  const handleLater = () => {
    markCustomerMarketingPromptShown();
    onOpenChange(false);
  };

  const handleActivate = async () => {
    if (!isCustomerMarketingPushSupported()) {
      toast.info(copy.denied);
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      const result = await subscribeCustomerMarketingPush(storeId);
      if (result.ok) {
        toast.success(copy.success);
        onOpenChange(false);
      } else if (result.error?.includes("negada") || result.error?.includes("denied")) {
        toast.info(copy.denied);
        onOpenChange(false);
      } else {
        toast.error(result.error || copy.denied);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-left pt-1">{copy.desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={() => void handleActivate()} disabled={busy}>
            {busy ? "…" : copy.activate}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleLater}>
            {copy.later}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerNotificationOptInDialog;
