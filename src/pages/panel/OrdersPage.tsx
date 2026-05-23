import { useCallback, useMemo, useState } from "react";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, ChefHat, CheckCircle, Truck, Bike } from "lucide-react";
import { getStatusLabel, type OrderStatus } from "@/lib/orderStatusLabels";
import { usePanelOrders } from "@/features/ops/usePanelOrders";
import OpsOrdersLayout from "@/features/ops/OpsOrdersLayout";
import OpsStatusTabs from "@/features/ops/OpsStatusTabs";
import OpsOrderCard from "@/features/ops/OpsOrderCard";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  out_for_delivery: Bike,
  delivered: Truck,
};

const columns: OrderStatus[] = ["pending", "preparing", "ready", "out_for_delivery", "delivered"];

const OrdersPage = () => {
  const { storeId, loading: storeLoading } = useAdminStoreId();
  const { orders, itemsByOrder, loading, updateStatus, cancelOrder, setPrepMinutes, refresh } = usePanelOrders(storeId);
  const [mobileTab, setMobileTab] = useState<OrderStatus>("pending");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdvance = useCallback(
    async (order: Parameters<typeof updateStatus>[0], status: OrderStatus, prepMinutes?: number) => {
      const ok = await updateStatus(order, status, prepMinutes);
      if (ok) setMobileTab(status);
    },
    [updateStatus],
  );

  const visibleColumns = useMemo(
    () =>
      columns.filter(
        (col) =>
          col !== "out_for_delivery" ||
          orders.some((o) => o.status === "out_for_delivery" || (o.order_type === "delivery" && o.status === "ready")),
      ),
    [orders],
  );

  const getOrdersByStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

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

  return (
    <OpsOrdersLayout columns={visibleColumns} orders={orders} onRefresh={handleRefresh} refreshing={refreshing}>
      <OpsStatusTabs
        columns={visibleColumns}
        orders={orders}
        selected={mobileTab}
        onSelect={setMobileTab}
      />

      {/* Mobile: single column filtered by tab */}
      <div className="md:hidden space-y-3">
        {mobileOrders.map((order) => (
          <OpsOrderCard
            key={order.id}
            order={order}
            items={itemsByOrder[order.id] || []}
            onAdvance={handleAdvance}
            onCancel={cancelOrder}
            onSetPrepMinutes={setPrepMinutes}
          />
        ))}
        {mobileOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
            Nenhum pedido em {getStatusLabel(mobileTab)}
          </div>
        )}
      </div>

      {/* Desktop: kanban columns without broken inline grid */}
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        {visibleColumns.map((status) => {
          const Icon = statusIcons[status] || Clock;
          const columnOrders = getOrdersByStatus(status);
          return (
            <div key={status} className="space-y-3 min-w-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon className="h-4 w-4" /> {getStatusLabel(status)}
                <Badge variant="secondary" className="ml-auto">
                  {columnOrders.length}
                </Badge>
              </h3>
              <div className="space-y-3 min-h-[120px]">
                {columnOrders.map((order) => (
                  <OpsOrderCard
                    key={order.id}
                    order={order}
                    items={itemsByOrder[order.id] || []}
                    onAdvance={handleAdvance}
                    onCancel={cancelOrder}
                    onSetPrepMinutes={setPrepMinutes}
                  />
                ))}
                {columnOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
                    Nenhum pedido
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </OpsOrdersLayout>
  );
};

export default OrdersPage;
