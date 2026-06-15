import { useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { BookOpen, Bell, Loader2 } from "lucide-react";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import PanelAlertsBar from "@/features/ops/PanelAlertsBar";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const LiveOrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t } = useStaffT();
  const [showHelp, setShowHelp] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  if (storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> {t("common.loading")}
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("common.no_store")}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-30 -mx-1 px-1 py-1.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b flex items-center justify-between gap-2">
        <h1 className="text-sm font-bold text-foreground px-1 truncate">{t("page.live.title")}</h1>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setShowAlerts(true)}
            aria-label={t("live.alerts.aria")}
            title={t("live.alerts.aria")}
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setShowHelp(true)}
            aria-label={t("live.help.aria")}
            title={t("live.help.aria")}
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <PanelOrdersBoard storeId={storeId} mode="live" hideInlineAlertsBar />

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("howto.title")}</DialogTitle>
          </DialogHeader>
          <HowToUsePanel
            defaultOpen
            purpose={t("howto.live.purpose")}
            whenToUse={t("howto.live.when")}
            steps={[
              t("howto.live.step1"),
              t("howto.live.step2"),
              t("howto.live.step3"),
              t("howto.live.step4"),
            ]}
            howToConfirm={t("howto.live.confirm")}
            assistantQuestion={t("howto.live.assistant")}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("live.alerts.title")}</DialogTitle>
          </DialogHeader>
          <PanelAlertsBar storeId={storeId} />
          <p className="text-xs text-muted-foreground">{t("live.alerts.hint")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveOrdersPage;
