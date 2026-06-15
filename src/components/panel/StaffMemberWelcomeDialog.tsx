import { Copy, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildStaffOnboardingSummary,
  buildStaffOnboardingWhatsAppUrl,
  type StaffOnboardingInput,
} from "@/lib/staffOnboardingGuide";
import { useStaffT } from "@/hooks/useStaffT";

type Props = {
  open: boolean;
  data: StaffOnboardingInput | null;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "review";
};

const StaffMemberWelcomeDialog = ({ open, data, onOpenChange, mode = "create" }: Props) => {
  const { t } = useStaffT();

  if (!data) return null;

  const summary = buildStaffOnboardingSummary(data);
  const title =
    mode === "review" ? t("welcome.review.title") : t("welcome.create.title");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success(t("welcome.copied"));
    } catch {
      toast.error(t("welcome.copy_error"));
    }
  };

  const shareWhatsApp = () => {
    window.open(buildStaffOnboardingWhatsAppUrl(summary), "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("welcome.description")}</DialogDescription>
        </DialogHeader>

        <pre className="flex-1 overflow-y-auto rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {summary}
        </pre>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void copyAll()}>
            <Copy className="w-4 h-4 mr-2" />
            {t("welcome.copy")}
          </Button>
          <Button type="button" className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={shareWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("welcome.whatsapp")}
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffMemberWelcomeDialog;
