import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";
import {
  sanitizeStaffAccessPinInput,
  staffAccessPinHint,
  validateStaffAccessPin,
} from "@/lib/staffAccessPin";

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {options?.title ?? t("staffPin.confirm.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {options?.description ?? t("staffPin.confirm.description")}
          </p>
          {options?.amountLabel ? (
            <p className="text-base font-bold text-primary tabular-nums">{options.amountLabel}</p>
          ) : null}
          <div>
            <Label htmlFor="staff-payment-pin">{t("staffPin.confirm.label")}</Label>
            <Input
              id="staff-payment-pin"
              type="password"
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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {t("staffPin.confirm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPinConfirmDialog;
