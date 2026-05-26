import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, ChefHat, Package, CheckCircle2, XCircle } from "lucide-react";
import { getStatusLabel, type OrderStatus } from "@/lib/orderStatusLabels";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import { usePanelOrders } from "@/features/ops/usePanelOrders";
import OpsOrdersLayout from "@/features/ops/OpsOrdersLayout";
import OpsStatusTabs from "@/features/ops/OpsStatusTabs";
import OpsOrderCard from "@/features/ops/OpsOrderCard";
import OpsOrderDetailSheet from "@/features/ops/OpsOrderDetailSheet";
import OpsAcceptEtaDialog from "@/features/ops/OpsAcceptEtaDialog";
import OpsDeliveryConfirmDialog from "@/features/ops/OpsDeliveryConfirmDialog";
import OpsModeFilter, { filterOrdersByMode, type OpsViewMode } from "@/features/ops/OpsModeFilter";
import PanelAlertsBar from "@/features/ops/PanelAlertsBar";
import PanelPrintStatusBar from "@/features/ops/PanelPrintStatusBar";
import { usePanelPrintStatus } from "@/features/ops/usePanelPrintStatus";
import type { PanelOrder } from "@/features/ops/usePanelOrders";
import { columnHeaderAccentClass } from "@/features/ops/opsOrderUi";
import {
  acknowledgePendingOrderAlert,
  isPendingOrderAlerting,
  PANEL_UNACK_CHANGED_EVENT,
} from "@/lib/panelAlerts";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Package,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const BASE_COLUMNS: OrderStatus[] = ["pending", "preparing", "ready", "delivered", "cancelled"];

const OrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const {
    orders,
    itemsByOrder,
    loading,
    connectionStatus,
    updateStatus,
    cancelOrder,
    setPrepMinutes,
    markOrderPaid,
    confirmDelivery,
    ensureDeliveryCode,
    refresh,
  } = usePanelOrders(storeId);
  const { summary: printSummary, loading: printLoading } = usePanelPrintStatus(storeId);
  const [mobileTab, setMobileTab] = useState<OrderStatus>("pending");
  const [viewMode, setViewMode] = useState<OpsViewMode>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [etaDialogOrder, setEtaDialogOrder] = useState<PanelOrder | null>(null);
  const [deliveryConfirmOrder, setDeliveryConfirmOrder] = useState<PanelOrder | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [, setUnackTick] = useState(0);

  useEffect(() => {
    const sync = () => setUnackTick((t) => t + 1);
    window.addEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
  }, []);

  const openOrderDetail = useCallback((order: PanelOrder) => {
    acknowledgePendingOrderAlert(order.id);
    setDetailOrderId(order.id);
  }, []);

  const openAcceptDialog = useCallback((order: PanelOrder) => {
    acknowledgePendingOrderAlert(order.id);
    setEtaDialogOrder(order);
  }, []);

  const openDeliveryConfirmDialog = useCallback(
    (order: PanelOrder) => {
      void (async () => {
        const withCode = await ensureDeliveryCode(order);
        setDeliveryConfirmOrder(withCode);
      })();
    },
    [ensureDeliveryCode],
  );

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
        setMobileTab(panelColumnStatus(status));
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

  const handleConfirmDelivery = useCallback(
    async (order: PanelOrder, code: string) => {
      setConfirmingDelivery(true);
      try {
        const ok = await confirmDelivery(order, code);
        if (ok) {
          setDeliveryConfirmOrder(null);
          setDetailOrderId(null);
          setMobileTab("delivered");
        }
      } finally {
        setConfirmingDelivery(false);
      }
    },
    [confirmDelivery],
  );

  const filteredOrders = useMemo(() => filterOrdersByMode(orders, viewMode), [orders, viewMode]);

  const visibleColumns = BASE_COLUMNS;

  const getOrdersByStatus = (status: OrderStatus) =>
    filteredOrders.filter((o) => panelColumnStatus(o.status) === status);

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
    const accent = columnHeaderAccentClass(status);
    return (
      <div key={status} className="flex flex-col min-w-0 min-h-0 max-h-[calc(100vh-16rem)] xl:max-h-[calc(100vh-14rem)]">
        <h3 className={`font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2 shrink-0 ${accent}`}>
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
              needsAttention={isPendingOrderAlerting(order.id)}
              onAdvance={handleAdvance}
              onCancel={cancelOrder}
              onOpenDetail={openOrderDetail}
              onRequestAccept={openAcceptDialog}
              onRequestDeliveryConfirm={openDeliveryConfirmDialog}
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
              needsAttention={isPendingOrderAlerting(order.id)}
              onAdvance={handleAdvance}
              onCancel={cancelOrder}
              onOpenDetail={openOrderDetail}
              onRequestAccept={openAcceptDialog}
              onRequestDeliveryConfirm={openDeliveryConfirmDialog}
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
        onRequestAccept={openAcceptDialog}
        onRequestDeliveryConfirm={openDeliveryConfirmDialog}
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

      <OpsDeliveryConfirmDialog
        order={deliveryConfirmOrder}
        open={!!deliveryConfirmOrder}
        onOpenChange={(open) => {
          if (!open) setDeliveryConfirmOrder(null);
        }}
        onConfirm={handleConfirmDelivery}
        confirming={confirmingDelivery}
      />
    </>
  );
};

export default OrdersPage;
