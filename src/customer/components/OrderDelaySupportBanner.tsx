import { useEffect, useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStoreCustomerContact } from "@/hooks/useStoreCustomerContact";
import OrderSupportChat from "@/components/customer/OrderSupportChat";
import {
  formatDisplayPhone,
  isOrderDelayedPending,
  telHref,
  whatsappHref,
} from "@/lib/storeCustomerContact";

type Props = {
  orderId?: string;
  storeId: string | undefined;
  status: string;
  createdAt: string;
  orderNumber?: string | number;
  customerPhone?: string;
};

const OrderDelaySupportBanner = ({
  orderId,
  storeId,
  status,
  createdAt,
  orderNumber,
  customerPhone,
}: Props) => {
  const { t } = useLanguage();
  const { contact } = useStoreCustomerContact(storeId);
  const [now, setNow] = useState(() => Date.now());
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!isOrderDelayedPending(status, createdAt, now)) return null;

  const phones = [contact?.phone, contact?.phone_secondary].filter(Boolean) as string[];
  const whatsapp = contact?.whatsapp_phone || contact?.phone;
  const waMessage = orderNumber
    ? t("orderDelayWhatsappMessage").replace("{n}", String(orderNumber))
    : t("orderDelayWhatsappMessageGeneric");

  return (
    <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
      <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{t("orderDelayTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("orderDelayBody")}</p>
      <div className="flex flex-wrap gap-2">
        {orderId && (
          <Button
            type="button"
            size="sm"
            variant={chatOpen ? "default" : "secondary"}
            className="h-9 gap-1.5 font-bold"
            onClick={() => setChatOpen((v) => !v)}
          >
            <MessageCircle className="h-4 w-4" />
            Chat com o restaurante
          </Button>
        )}
        {phones.map((phone) => (
          <Button key={phone} asChild variant="outline" size="sm" className="h-9 gap-1.5 font-bold">
            <a href={telHref(phone)}>
              <Phone className="h-4 w-4" />
              {formatDisplayPhone(phone)}
            </a>
          </Button>
        ))}
        {whatsapp && (
          <Button asChild size="sm" className="h-9 gap-1.5 font-bold bg-[#25D366] hover:bg-[#1ebe57] text-white">
            <a href={whatsappHref(whatsapp, waMessage)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        )}
      </div>
      {chatOpen && orderId && (
        <OrderSupportChat
          orderId={orderId}
          customerPhone={customerPhone}
          senderRole="customer"
          title="Mensagens com o restaurante"
          placeholder="Explique o atraso — o restaurante responde aqui."
        />
      )}
    </div>
  );
};

export default OrderDelaySupportBanner;
