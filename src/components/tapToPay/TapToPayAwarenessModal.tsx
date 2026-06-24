import { useState } from "react";
import { Loader2, Smartphone, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStaffT } from "@/hooks/useStaffT";
import {
  markTapToPayAwarenessSeen,
  markTapToPayEducationSeen,
  setTapToPayUserEnabled,
} from "@/lib/tapToPayPrefs";
import { waitForStaffPinUiDismiss } from "@/lib/prepareTapToPayCheckout";
import { isTapToPayUserEnabled } from "@/lib/tapToPayPrefs";
import { showTapToPayMerchantEducation, warmUpTapToPayReader } from "@/lib/stripeTerminalService";
import { tapToPayDialogContentClass, tapToPayDialogOpenFocusHandlers } from "@/components/tapToPay/tapToPayDialogClasses";
import { toast } from "sonner";

type Props = {
  open: boolean;
  storeId: string;
  onOpenChange: (open: boolean) => void;
  onEnabled?: () => void;
};

export default function TapToPayAwarenessModal({ open, storeId, onOpenChange, onEnabled }: Props) {
  const { t } = useStaffT();
  const [enabling, setEnabling] = useState(false);

  const handleEnable = async () => {
    if (enabling) return;
    setEnabling(true);
    try {
      markTapToPayAwarenessSeen();
      setTapToPayUserEnabled(true);
      onOpenChange(false);
      await waitForStaffPinUiDismiss();
      await showTapToPayMerchantEducation();
      markTapToPayEducationSeen();
      const status = await warmUpTapToPayReader(storeId);
      if (status === "error") {
        toast.error(t("tapToPay.settings.warmup_error"), { duration: 8000 });
      } else {
        toast.success(t("tapToPay.settings.status_ready"));
      }
      onEnabled?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tapToPay.settings.warmup_error"), { duration: 8000 });
    } finally {
      setEnabling(false);
    }
  };

  const handleLater = () => {
    markTapToPayAwarenessSeen();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={tapToPayDialogContentClass("max-w-md border-primary/20 p-0 gap-0 flex flex-col overflow-hidden")}
        {...tapToPayDialogOpenFocusHandlers}
      >
        <div className="shrink-0 bg-gradient-to-b from-primary to-primary/85 px-5 pt-6 pb-5 text-primary-foreground text-center sm:px-6 sm:pt-8 sm:pb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary-foreground/15 ring-2 ring-primary-foreground/25">
            <Smartphone className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-lg sm:text-xl font-black text-primary-foreground">
              {t("tapToPay.awareness.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-primary-foreground/85 leading-relaxed">
              {t("tapToPay.awareness.desc")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-card px-5 py-4 sm:px-6 sm:py-5">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{t("tapToPay.awareness.point1")}</span>
            </li>
            <li className="flex gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{t("tapToPay.awareness.point2")}</span>
            </li>
            <li className="flex gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{t("tapToPay.awareness.point3")}</span>
            </li>
          </ul>
        </div>

        <div className="shrink-0 space-y-2 border-t bg-card px-5 py-4 sm:px-6 sm:py-5">
          <Button
            className="w-full h-12 font-black text-base"
            onClick={() => void handleEnable()}
            disabled={enabling}
          >
            {enabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("tapToPay.awareness.enable")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleLater} disabled={enabling}>
            {t("tapToPay.awareness.later")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
