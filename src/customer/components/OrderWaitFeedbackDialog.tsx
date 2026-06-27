import { useState } from "react";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { markWaitFeedbackDismissed, markWaitFeedbackSent } from "@/lib/waitFeedbackStorage";
import { toast } from "sonner";

type Props = {
  open: boolean;
  orderId: string;
  orderNumber?: string;
  onClose: () => void;
};

export default function OrderWaitFeedbackDialog({ open, orderId, orderNumber, onClose }: Props) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleDismiss = () => {
    markWaitFeedbackDismissed(orderId);
    onClose();
  };

  const handleSubmit = async () => {
    const text = message.trim();
    if (text.length < 3) {
      toast.error(t("waitFeedbackTooShort"));
      return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc("submit_customer_order_feedback", {
      _order_id: orderId,
      _message: text,
    });
    setSending(false);
    if (error || !data || !(data as { success?: boolean }).success) {
      toast.error(t("waitFeedbackError"));
      return;
    }
    markWaitFeedbackSent(orderId);
    toast.success(t("waitFeedbackThanks"));
    setMessage("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            {t("waitFeedbackTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("waitFeedbackBody")}
            {orderNumber ? (
              <span className="block mt-1 text-xs">
                {t("orderNumber")} #{orderNumber}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("waitFeedbackPlaceholder")}
          rows={4}
          maxLength={2000}
          className="resize-none"
        />
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={handleDismiss} disabled={sending}>
            {t("waitFeedbackNotNow")}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={sending || message.trim().length < 3}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {t("waitFeedbackSend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
