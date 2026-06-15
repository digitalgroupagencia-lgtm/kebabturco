import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import type { PanelOrder } from "./usePanelOrders";
import { validateDeliveryCode } from "./opsOrderUi";

type Props = {
  order: PanelOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (order: PanelOrder, code: string) => void | Promise<void>;
  confirming?: boolean;
};

const OpsDeliveryConfirmDialog = ({ order, open, onOpenChange, onConfirm, confirming }: Props) => {
  const { t, lang } = useStaffT();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
    }
  }, [open, order?.id]);

  const valid = validateDeliveryCode(code);

  const handleConfirm = async () => {
    if (!order || !valid) {
      setError(t("dialog.delivery.error_digits"));
      return;
    }
    setError(null);
    try {
      await onConfirm(order, code.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dialog.delivery.error_invalid"));
    }
  };

  const description = order
    ? panelT(lang, "dialog.delivery.desc_order", { code: order.order_number })
    : t("dialog.delivery.desc_default");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            {t("dialog.delivery.title")}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delivery-code" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dialog.delivery_code.title")}
          </Label>
          <Input
            id="delivery-code"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={code}
            disabled={confirming}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
              setError(null);
            }}
            className="h-12 text-center text-2xl font-black tracking-[0.3em] tabular-nums"
            autoComplete="one-time-code"
          />
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={confirming} onClick={() => onOpenChange(false)}>
            {t("common.back")}
          </Button>
          <Button
            type="button"
            disabled={!valid || confirming}
            className="font-bold bg-orange-600 hover:bg-orange-700"
            onClick={() => void handleConfirm()}
          >
            {confirming ? t("dialog.delivery.validating") : t("dialog.delivery.complete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpsDeliveryConfirmDialog;
