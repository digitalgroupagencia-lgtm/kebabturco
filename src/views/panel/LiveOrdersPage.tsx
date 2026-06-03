import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import { useStaffT } from "@/hooks/useStaffT";

const LiveOrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t } = useStaffT();

  if (storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> {t("common.loading")}
      </div>
    );
  }

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("common.empty")}</div>;
  }

  return (
    <div className="space-y-2">
      <h1 className="text-sm font-bold text-foreground px-1">{t("page.live.title")}</h1>
      <PanelOrdersBoard storeId={storeId} mode="live" />
    </div>
  );
};

export default LiveOrdersPage;
