import { Smartphone, Sparkles } from "lucide-react";
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
import { showTapToPayMerchantEducation, warmUpTapToPayReader } from "@/lib/stripeTerminalService";

type Props = {
  open: boolean;
  storeId: string;
  onOpenChange: (open: boolean) => void;
  onEnabled?: () => void;
};

export default function TapToPayAwarenessModal({ open, storeId, onOpenChange, onEnabled }: Props) {
  const { t } = useStaffT();

  const handleEnable = async () => {
    markTapToPayAwarenessSeen();
    setTapToPayUserEnabled(true);
    await showTapToPayMerchantEducation();
    markTapToPayEducationSeen();
    void warmUpTapToPayReader(storeId);
    onEnabled?.();
    onOpenChange(false);
  };

  const handleLater = () => {
    markTapToPayAwarenessSeen();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary/20 p-0 overflow-hidden gap-0">
        <div className="bg-gradient-to-b from-primary to-primary/85 px-6 pt-8 pb-6 text-primary-foreground text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/15 ring-2 ring-primary-foreground/25">
            <Smartphone className="h-8 w-8" />
          </div>
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-xl font-black text-primary-foreground">
              {t("tapToPay.awareness.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-primary-foreground/85 leading-relaxed">
              {t("tapToPay.awareness.desc")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 bg-card px-6 py-5">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{t("tapToPay.awareness.point1")}</span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{t("tapToPay.awareness.point2")}</span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <span>{t("tapToPay.awareness.point3")}</span>
            </li>
          </ul>

          <Button className="w-full h-12 font-black text-base" onClick={() => void handleEnable()}>
            {t("tapToPay.awareness.enable")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleLater}>
            {t("tapToPay.awareness.later")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
