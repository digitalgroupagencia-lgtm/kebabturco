import { useCallback, useMemo, useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, ChefHat, CheckCircle, Truck, Bike, XCircle } from "lucide-react";
import { getStatusLabel, type OrderStatus } from "@/lib/orderStatusLabels";
import { usePanelOrders } from "@/features/ops/usePanelOrders";
import OpsOrdersLayout from "@/features/ops/OpsOrdersLayout";
import OpsStatusTabs from "@/features/ops/OpsStatusTabs";
import OpsOrderCard from "@/features/ops/OpsOrderCard";
import OpsOrderDetailSheet from "@/features/ops/OpsOrderDetailSheet";
import OpsAcceptEtaDialog from "@/features/ops/OpsAcceptEtaDialog";
import OpsModeFilter, { filterOrdersByMode, type OpsViewMode } from "@/features/ops/OpsModeFilter";
import PanelAlertsBar from "@/features/ops/PanelAlertsBar";
import PanelPrintStatusBar from "@/features/ops/PanelPrintStatusBar";
import { usePanelPrintStatus } from "@/features/ops/usePanelPrintStatus";
import type { PanelOrder } from "@/features/ops/usePanelOrders";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  out_for_delivery: Bike,
  delivered: Truck,
  cancelled: XCircle,
};

const BASE_COLUMNS: OrderStatus[] = ["pending", "preparing", "ready", "delivered", "cancelled"];

const OrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { orders, itemsByOrder, loading, connectionStatus, updateStatus, cancelOrder, setPrepMinutes, markOrderPaid, refresh } =
    usePanelOrders(storeId);
  const { summary: printSummary, loading: printLoading } = usePanelPrintStatus(storeId);
  const [mobileTab, setMobileTab] = useState<OrderStatus>("pending");
  const [viewMode, setViewMode] = useState<OpsViewMode>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [etaDialogOrder, setEtaDialogOrder] = useState<PanelOrder | null>(null);
  const [accepting, setAccepting] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdvance = useCallback(
    async (order: PanelOrder, status: OrderStatus, prepMinutes?: number) => {
      const ok = await updateStatus(order, status, prepMinutes);
      if (ok) {
        setMobileTab(status);
        if (detailOrderId === order.id && status !== "pending") {
          setDetailOrderId(null);
        }
      }
      return ok;
    },
    [updateStatus, detailOrderId],
  );

  const handleAcceptWithEta = useCallback(
    async (order: PanelOrder, minutes: number) => {
      setAccepting(true);
      try {
        const ok = await handleAdvance(order, "preparing", minutes);
        if (ok) {
          setEtaDialogOrder(null);
          setDetailOrderId(null);
        }
      } finally {
        setAccepting(false);
      }
    },
    [handleAdvance],
  );

  const filteredOrders = useMemo(() => filterOrdersByMode(orders, viewMode), [orders, viewMode]);

  const visibleColumns = useMemo(() => {
    const cols = [...BASE_COLUMNS];
    const showDelivery =
      filteredOrders.some(
        (o) => o.status === "out_for_delivery" || (o.order_type === "delivery" && o.status === "ready"),
      );
    if (showDelivery) {
      cols.splice(3, 0, "out_for_delivery");
    }
    return cols;
  }, [filteredOrders]);

  const getOrdersByStatus = (status: OrderStatus) => filteredOrders.filter((o) => o.status === status);

  const detailOrder = detailOrderId ? orders.find((o) => o.id === detailOrderId) ?? null : null;

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">Nenhuma loja vinculada.</div>;
  }

  if (loading || storeLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> A carregar pedidos...
      </div>
    );
  }

  const mobileOrders = getOrdersByStatus(mobileTab);

  const renderColumn = (status: OrderStatus) => {
    const Icon = statusIcons[status] || Clock;
    const columnOrders = getOrdersByStatus(status);
    return (
      <div key={status} className="flex flex-col min-w-0 min-h-0 max-h-[calc(100vh-16rem)] xl:max-h-[calc(100vh-14rem)]">
        <h3 className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2 shrink-0 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {getStatusLabel(status)}
          <Badge variant="secondary" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
            {columnOrders.length}
          </Badge>
        </h3>
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[80px]">
          {columnOrders.map((order) => (
            <OpsOrderCard
              key={order.id}
              order={order}
              items={itemsByOrder[order.id] || []}
              onAdvance={handleAdvance}
              onCancel={cancelOrder}
              onOpenDetail={(o) => setDetailOrderId(o.id)}
              onRequestAccept={(o) => setEtaDialogOrder(o)}
            />
          ))}
          {columnOrders.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-lg">
              Nenhum pedido
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <OpsOrdersLayout
        columns={visibleColumns}
        orders={filteredOrders}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        connectionStatus={connectionStatus}
        headerExtra={
          <div className="space-y-2">
            <PanelAlertsBar />
            <PanelPrintStatusBar summary={printSummary} loading={printLoading} />
            <OpsModeFilter selected={viewMode} onSelect={setViewMode} orders={orders} />
          </div>
        }
      >
        <OpsStatusTabs
          columns={visibleColumns}
          orders={filteredOrders}
          selected={mobileTab}
          onSelect={setMobileTab}
        />

        <div className="md:hidden space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5">
          {mobileOrders.map((order) => (
            <OpsOrderCard
              key={order.id}
              order={order}
              items={itemsByOrder[order.id] || []}
              onAdvance={handleAdvance}
              onCancel={cancelOrder}
              onOpenDetail={(o) => setDetailOrderId(o.id)}
              onRequestAccept={(o) => setEtaDialogOrder(o)}
            />
          ))}
          {mobileOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
              Nenhum pedido em {getStatusLabel(mobileTab)}
              {viewMode !== "all" ? " neste modo" : ""}
            </div>
          )}
        </div>

        <div
          className="hidden md:grid gap-3 min-h-0"
          style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}
        >
          {visibleColumns.map(renderColumn)}
        </div>
      </OpsOrdersLayout>

      <OpsOrderDetailSheet
        order={detailOrder}
        items={detailOrder ? itemsByOrder[detailOrder.id] || [] : []}
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) setDetailOrderId(null);
        }}
        onAdvance={handleAdvance}
        onRequestAccept={(o) => setEtaDialogOrder(o)}
        onCancel={cancelOrder}
        onSetPrepMinutes={setPrepMinutes}
        onMarkPaid={(o, m) => {
          void markOrderPaid(o, m);
        }}
      />

      <OpsAcceptEtaDialog
        order={etaDialogOrder}
        open={!!etaDialogOrder}
        onOpenChange={(open) => {
          if (!open) setEtaDialogOrder(null);
        }}
        onConfirm={handleAcceptWithEta}
        confirming={accepting}
      />
    </>
  );
};

export default OrdersPage;
