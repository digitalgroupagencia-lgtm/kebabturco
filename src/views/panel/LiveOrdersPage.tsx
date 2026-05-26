import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";

const LiveOrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">Nenhuma loja vinculada.</div>;
  }

  if (storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> A carregar...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title="Operação ao vivo"
        description="Mantenha esta página aberta no monitor da cozinha ou balcão. Só pedidos em tempo real — sem resumos nem avisos administrativos."
      />
      <PanelOrdersBoard storeId={storeId} mode="live" />
    </div>
  );
};

export default LiveOrdersPage;
