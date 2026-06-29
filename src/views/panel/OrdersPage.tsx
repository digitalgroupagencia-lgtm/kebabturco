import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import { useStaffT } from "@/hooks/useStaffT";

/** Alias legado, /panel aponta para a operação ao vivo. */
const OrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t } = useStaffT();

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">{t("common.no_store")}</div>;
  }

  if (storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> {t("orders.loading")}
      </div>
    );
  }

  return <PanelOrdersBoard storeId={storeId} mode="live" />;
};

export default OrdersPage;
