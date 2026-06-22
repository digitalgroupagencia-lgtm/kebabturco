import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SecretInput } from "@/components/ui/secret-input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";
import {
  sanitizeStaffAccessPinInput,
  staffAccessPinHint,
  validateStaffAccessPin,
} from "@/lib/staffAccessPin";
import { tapToPayDialogContentClass } from "@/components/tapToPay/tapToPayDialogClasses";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={tapToPayDialogContentClass("max-w-sm flex flex-col gap-0 p-0 overflow-hidden")}>
        <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <KeyRound className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">{options?.title ?? t("staffPin.confirm.title")}</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-2 sm:px-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            {options?.description ?? t("staffPin.confirm.description")}
          </p>
          {options?.amountLabel ? (
            <p className="text-base font-bold text-primary tabular-nums">{options.amountLabel}</p>
          ) : null}
          <div>
            <Label htmlFor="staff-payment-pin">{t("staffPin.confirm.label")}</Label>
            <SecretInput
              id="staff-payment-pin"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(sanitizeStaffAccessPinInput(e.target.value));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              placeholder={t("staffPin.confirm.placeholder")}
              className="mt-1 text-center text-lg tracking-[0.3em] font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1.5">{staffAccessPinHint(lang)}</p>
            {error ? <p className="text-xs text-destructive mt-1">{error}</p> : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:px-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm} className="w-full sm:w-auto">
            {t("staffPin.confirm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPinConfirmDialog;
