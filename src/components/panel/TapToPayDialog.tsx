import { useCallback, useState } from "react";
import { Loader2, Smartphone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PanelOrder } from "@/features/ops/usePanelOrders";
import { useStaffT } from "@/hooks/useStaffT";
import {
  disconnectTapToPayReader,
  runTapToPayForOrder,
  type TapToPayStep,
} from "@/lib/stripeTerminalService";
import { isValidOptionalEmail } from "@/lib/emailValidation";

type Props = {
  open: boolean;
  order: PanelOrder | null;
  storeId: string;
  staffPin: string;
  onClose: () => void;
  onSuccess: (order: PanelOrder) => void;
};

const stepMessage = (step: TapToPayStep, t: (k: string) => string): string => {
  switch (step) {
    case "connecting":
      return t("tapToPay.step.connecting");
    case "waiting_card":
      return t("tapToPay.step.waiting");
    case "processing":
      return t("tapToPay.step.processing");
    case "success":
      return t("tapToPay.step.success");
    case "error":
      return t("tapToPay.step.error");
    default:
      return "";
  }
};

export default function TapToPayDialog({ open, order, storeId, staffPin, onClose, onSuccess }: Props) {
  const { t } = useStaffT();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<TapToPayStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setBusy(false);
    setEmail("");
  }, []);

  const handleClose = useCallback(() => {
    void disconnectTapToPayReader();
    reset();
    onClose();
  }, [onClose, reset]);

  const startPayment = async () => {
    if (!order || busy) return;
    if (email.trim() && !isValidOptionalEmail(email)) {
      setError(t("tapToPay.invalidEmail"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await runTapToPayForOrder({
        storeId,
        orderId: order.id,
        orderNumber: Number(order.order_number),
        amountEuro: Number(order.total),
        staffPin,
        customerEmail: email.trim() || (order as { customer_email?: string | null }).customer_email,
        onStep: (s, msg) => {
          setStep(s);
          if (msg) setError(s === "error" ? msg : null);
        },
      });
      onSuccess(order);
      handleClose();
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : t("tapToPay.failed"));
    } finally {
      setBusy(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            {t("tapToPay.title")} #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t("tapToPay.subtitle")}</p>
        <p className="text-2xl font-black">€{Number(order.total).toFixed(2)}</p>

        <div className="space-y-2">
          <Label htmlFor="tap-email">{t("tapToPay.emailLabel")}</Label>
          <Input
            id="tap-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("tapToPay.emailPlaceholder")}
            disabled={busy}
          />
        </div>

        {step !== "idle" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
            {busy && step !== "success" && step !== "error" ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
            ) : null}
            <p className="text-sm font-medium">{stepMessage(step, t)}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
            <X className="w-4 h-4 mr-1" />
            {t("tapToPay.cancel")}
          </Button>
          <Button type="button" onClick={() => void startPayment()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t("tapToPay.start")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
