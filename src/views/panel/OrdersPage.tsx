import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";

/** Alias legado — /panel aponta para a operação ao vivo. */
const OrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">Nenhuma loja vinculada.</div>;
  }

  if (storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> A carregar pedidos...
      </div>
    );
  }

  return <PanelOrdersBoard storeId={storeId} mode="live" />;
};

export default OrdersPage;
