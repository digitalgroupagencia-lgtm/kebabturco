import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Smartphone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStaffT } from "@/hooks/useStaffT";
import {
  cancelTapToPayPayment,
  runTapToPayForOrder,
  type TapToPayStep,
} from "@/lib/stripeTerminalService";
import { ensureTapToPayReaderReady } from "@/lib/prepareTapToPayCheckout";
import { isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { isValidOptionalEmail } from "@/lib/emailValidation";
import { tapToPayDialogContentClass } from "@/components/tapToPay/tapToPayDialogClasses";
import { useNavigate } from "react-router-dom";
import { nav } from "@/lib/navPaths";

export type TapToPayDialogOrder = {
  id: string;
  order_number: string | number;
  total: number | string;
  customer_email?: string | null;
};

type Props = {
  open: boolean;
  order: TapToPayDialogOrder | null;
  storeId: string;
  staffPin: string;
  onClose: () => void;
  onSuccess: (order: TapToPayDialogOrder) => void;
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
  const navigate = useNavigate();
  const tapEnabled = isTapToPayUserEnabled();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<TapToPayStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [readerReady, setReaderReady] = useState(false);
  const [preparingReader, setPreparingReader] = useState(false);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setBusy(false);
    setEmail("");
    setReaderReady(false);
    setPreparingReader(false);
  }, []);

  const prepareReader = useCallback(async () => {
    setPreparingReader(true);
    setError(null);
    setStep("connecting");
    try {
      const result = await ensureTapToPayReaderReady(storeId);
      if (result.ok) {
        setReaderReady(true);
        setStep("idle");
        setError(null);
      } else {
        setReaderReady(false);
        setStep("error");
        setError((result as { ok: false; message: string }).message);
      }
    } catch (e) {
      setReaderReady(false);
      setStep("error");
      setError(e instanceof Error ? e.message : t("tapToPay.settings.warmup_error"));
    } finally {
      setPreparingReader(false);
    }
  }, [storeId, t]);

  useEffect(() => {
    if (!open || !order) return;

    setEmail(order.customer_email?.trim() ?? "");
    setBusy(false);

    if (!tapEnabled) {
      setReaderReady(false);
      setStep("error");
      setError(t("tapToPay.settings.help"));
      return;
    }

    setStep("idle");
    setError(null);
    void prepareReader();
  }, [open, order, prepareReader, tapEnabled, t]);

  const handleClose = useCallback(() => {
    if (busy) {
      void cancelTapToPayPayment();
    }
    reset();
    onClose();
  }, [busy, onClose, reset]);

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
        customerEmail: email.trim() || order.customer_email,
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
      <DialogContent
        className={tapToPayDialogContentClass("z-[100] sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden")}
      >
        <div className="shrink-0 border-b px-4 pt-4 pb-3 sm:px-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Smartphone className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">{t("tapToPay.title")} #{order.order_number}</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 space-y-4">
          <p className="text-sm text-muted-foreground">{t("tapToPay.subtitle")}</p>
          <p className="text-2xl font-black">€{Number(order.total).toFixed(2)}</p>

          <div className="space-y-2">
            <Label htmlFor="tap-email">{t("tapToPay.emailLabel")}</Label>
            <Input
              id="tap-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("tapToPay.emailPlaceholder")}
              disabled={busy}
              className="text-base"
            />
          </div>

          {!tapEnabled && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 space-y-2">
              <p className="text-sm font-medium">{t("tapToPay.settings.help")}</p>
              <Button
                type="button"
                className="w-full font-bold"
                onClick={() => {
                  handleClose();
                  navigate(`${nav.panel("settings")}#tap-to-pay`);
                }}
              >
                {t("tapToPay.settings.enable")}
              </Button>
            </div>
          )}

          {tapEnabled && preparingReader && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t("tapToPay.step.connecting")}</p>
            </div>
          )}

          {tapEnabled && !readerReady && !busy && !preparingReader && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
              <p className="text-sm font-medium">{error ?? t("tapToPay.reader_not_ready")}</p>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void prepareReader()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {t("tapToPay.retry_reader")}
              </Button>
            </div>
          )}

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
        </div>

        <div className="shrink-0 flex flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:px-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-1" />
            {t("tapToPay.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void startPayment()}
            disabled={busy || !readerReady || preparingReader}
            className="w-full sm:w-auto"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {t("order.detail.tap_to_pay")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
