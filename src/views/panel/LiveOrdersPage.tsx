import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import PanelPageHeader from "@/components/panel/PanelPageHeader";
import PanelOrdersBoard from "@/features/ops/PanelOrdersBoard";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { useDemoMode } from "@/lib/demoMode";
import { DEMO_PANEL_LIVE_ORDERS } from "@/lib/demoData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LiveOrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { t } = useStaffT();
  const demoOn = useDemoMode();

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
      {demoOn ? (
        <div className="space-y-3">
          <Card className="border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            ⚠️ Modo demo ativo — pedidos de exemplo (não reais). Desligue em Admin → Simulador para ver pedidos reais.
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["pending", "preparing", "ready"] as const).map((col) => (
              <Card key={col} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold capitalize text-sm">
                    {col === "pending" ? "Novos" : col === "preparing" ? "Em preparo" : "Prontos"}
                  </h2>
                  <Badge variant="secondary">{DEMO_PANEL_LIVE_ORDERS.filter((o) => o.status === col).length}</Badge>
                </div>
                {DEMO_PANEL_LIVE_ORDERS.filter((o) => o.status === col).map((o) => (
                  <div key={o.id} className="rounded-lg border bg-card p-2.5 text-sm space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>#{o.order_number}</span>
                      <span>€{o.total.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.customer_name} · {o.order_type}</p>
                    <p className="text-xs">{o.items_summary}</p>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <PanelOrdersBoard storeId={storeId} mode="live" />
      )}
    </div>
  );
};

export default LiveOrdersPage;
