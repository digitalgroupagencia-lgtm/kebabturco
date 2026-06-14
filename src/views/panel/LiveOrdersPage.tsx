import { useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { BookOpen, Bell, Loader2, X } from "lucide-react";
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
    return <div className="p-8 text-muted-foreground">{t("common.empty")}</div>;
  }

  return (
    <div className="space-y-2">
      {/* Barra superior fixa com ícones de ajuda e alertas */}
      <div className="sticky top-0 z-30 -mx-1 px-1 py-1.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b flex items-center justify-between gap-2">
        <h1 className="text-sm font-bold text-foreground px-1 truncate">{t("page.live.title")}</h1>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setShowAlerts(true)}
            aria-label="Alertas de pedidos"
            title="Alertas de pedidos"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setShowHelp(true)}
            aria-label="Como usar esta tela"
            title="Como usar esta tela"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <PanelOrdersBoard storeId={storeId} mode="live" hideInlineAlertsBar />

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Como usar esta tela</DialogTitle>
          </DialogHeader>
          <HowToUsePanel
            defaultOpen
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
        </DialogContent>
      </Dialog>

      <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alertas de pedidos</DialogTitle>
          </DialogHeader>
          <PanelAlertsBar storeId={storeId} />
          <p className="text-xs text-muted-foreground">
            Activa ou desactiva o som e flash que avisa quando entra um pedido novo.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LiveOrdersPage;
