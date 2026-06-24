import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";
import {
  staffAccessPinHint,
  validateStaffAccessPin,
} from "@/lib/staffAccessPin";
import { tapToPayDialogContentClass } from "@/components/tapToPay/tapToPayDialogClasses";
import StaffPinKeypad from "@/components/tapToPay/StaffPinKeypad";

export type StaffPinConfirmOptions = {
  title?: string;
  description?: string;
  amountLabel?: string;
};

type Props = {
  open: boolean;
  options?: StaffPinConfirmOptions;
  onOpenChange: (open: boolean) => void;
  onConfirm: (pin: string) => void;
};

const StaffPinConfirmDialog = ({ open, options, onOpenChange, onConfirm }: Props) => {
  const { t, lang } = useStaffT();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (open) {
      setPin("");
      setError(null);
    }
  }, [open]);

  const handleConfirm = () => {
    const validation = validateStaffAccessPin(pin, lang);
    if (validation) {
      setError(validation);
      return;
    }
    onConfirm(pin.trim());
  };

  const title = options?.title ?? t("staffPin.confirm.title");
  const description = options?.description ?? t("staffPin.confirm.description");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={tapToPayDialogContentClass(
          "z-[100] sm:max-w-sm flex flex-col gap-0 p-0 overflow-hidden",
          isNative ? "max-sm:pt-[max(1rem,env(safe-area-inset-top))]" : undefined,
        )}
      >
        <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8 text-left">
              <KeyRound className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{title}</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-4 pb-2 sm:px-6">
          <p className="text-sm text-muted-foreground">{description}</p>
          {options?.amountLabel ? (
            <p className="text-xl font-black text-primary tabular-nums">{options.amountLabel}</p>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-center">{t("staffPin.confirm.label")}</p>
            <StaffPinKeypad
              value={pin}
              onChange={(next) => {
                setPin(next);
                setError(null);
              }}
              disabled={false}
            />
            <p className="text-xs text-muted-foreground text-center">{staffAccessPinHint(lang)}</p>
            {error ? <p className="text-sm text-destructive text-center font-medium">{error}</p> : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:px-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-12"
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} className="w-full sm:w-auto h-12 font-bold">
            {t("staffPin.confirm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPinConfirmDialog;
