import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";

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
      <HowToUsePanel
        purpose="Mostra todos os pedidos do dia em tempo real, organizados em colunas por estado (novo, em preparo, pronto, entregue)."
        whenToUse="Use durante o serviço. Esta é a tela principal da operação — deve ficar sempre aberta no balcão."
        steps={[
          "Quando entra um pedido novo, toca um som e aparece na primeira coluna.",
          "Toque no pedido para abrir o detalhe e confirmar.",
          "Arraste ou use os botões para mover entre colunas conforme o pedido avança.",
          "Pedidos vermelhos = atrasados. Pedidos amarelos = a chegar perto do limite.",
        ]}
        howToConfirm="Cada pedido novo dispara som + vibração. Se não tocar, vá em Configurações → Notificações e ative."
        assistantQuestion="Como funciona a tela de Pedidos em Vivo e o que cada cor/coluna significa?"
      />
      <h1 className="text-sm font-bold text-foreground px-1">{t("page.live.title")}</h1>
      <PanelOrdersBoard storeId={storeId} mode="live" />
    </div>
  );
};

export default LiveOrdersPage;
