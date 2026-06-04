import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
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
import OpsAssignDriverDialog, { type StoreDriver } from "@/features/ops/OpsAssignDriverDialog";
import OpsModeFilter, { filterOrdersByMode, type OpsViewMode } from "@/features/ops/OpsModeFilter";
import PanelAlertsBar from "@/features/ops/PanelAlertsBar";
import PanelAlertsPermissionDialog from "@/features/ops/PanelAlertsPermissionDialog";
import PanelPrintStatusBar from "@/features/ops/PanelPrintStatusBar";
import { isPanelAlertsEnabled, preparePanelAlertsIfEnabled } from "@/lib/panelAlerts";
import { restoreNativeStaffPushIfPossible, enableKeepAwake, disableKeepAwake } from "@/services/nativePush";
import { usePanelPrintStatus } from "@/features/ops/usePanelPrintStatus";
import { useStaffT } from "@/hooks/useStaffT";
import type { PanelOrder } from "@/features/ops/usePanelOrders";
import { columnHeaderAccentClass } from "@/features/ops/opsOrderUi";
import { listStoreDrivers } from "@/services/orderService";
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

export type PanelOrdersBoardMode = "live" | "full";

type Props = {
  storeId: string;
  mode?: PanelOrdersBoardMode;
};

const PanelOrdersBoard = ({ storeId, mode = "live" }: Props) => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const {
    orders,
    itemsByOrder,
    loading,
    connectionStatus,
    updateStatus,
    cancelOrder,
    setPrepMinutes,
    markOrderPaid,
    assignDriver,
    reprintOrder,
    refresh,
  } = usePanelOrders(storeId);
  const { summary: printSummary, loading: printLoading, refresh: refreshPrint, retryFailed, clearJobs } = usePanelPrintStatus(storeId);
  const [mobileTab, setMobileTab] = useState<OrderStatus>("pending");
  const [viewMode, setViewMode] = useState<OpsViewMode>("all");
  const [hideTests, setHideTests] = useState<boolean>(() => {
    try { return localStorage.getItem("panel-hide-tests") === "1"; } catch { return false; }
  });
  const [cleaningTests, setCleaningTests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [etaDialogOrder, setEtaDialogOrder] = useState<PanelOrder | null>(null);
  const [assignOrder, setAssignOrder] = useState<PanelOrder | null>(null);
  const [drivers, setDrivers] = useState<StoreDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [, setUnackTick] = useState(0);
  const [permissionOpen, setPermissionOpen] = useState(false);

  useEffect(() => {
    const sync = () => setUnackTick((t) => t + 1);
    window.addEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PANEL_UNACK_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    void preparePanelAlertsIfEnabled(storeId);
    void restoreNativeStaffPushIfPossible(storeId);
    void enableKeepAwake();
    if (!isPanelAlertsEnabled()) {
      setPermissionOpen(true);
    }
    return () => { void disableKeepAwake(); };
  }, [mode, storeId]);

  useEffect(() => {
    if (!storeId) return;
    setLoadingDrivers(true);
    void listStoreDrivers(storeId)
      .then(setDrivers)
      .finally(() => setLoadingDrivers(false));
  }, [storeId]);

  const driverNameById = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach((d) => map.set(d.user_id, d.full_name));
    return map;
  }, [drivers]);

  const openOrderDetail = useCallback((order: PanelOrder) => {
    acknowledgePendingOrderAlert(order.id);
    setDetailOrderId(order.id);
  }, []);

  const openAcceptDialog = useCallback((order: PanelOrder) => {
    acknowledgePendingOrderAlert(order.id);
    setEtaDialogOrder(order);
  }, []);

  const openAssignDialog = useCallback((order: PanelOrder) => {
    setAssignOrder(order);
  }, []);

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

  const handleAssignDriver = useCallback(
    async (order: PanelOrder, driverUserId: string) => {
      setAssigning(true);
      try {
        const ok = await assignDriver(order, driverUserId);
        if (ok) {
          setAssignOrder(null);
        }
      } finally {
        setAssigning(false);
      }
    },
    [assignDriver],
  );

  const testOrdersCount = useMemo(
    () => orders.filter((o) => (o as unknown as { is_test?: boolean }).is_test === true).length,
    [orders],
  );
  const visibleOrders = useMemo(
    () => (hideTests ? orders.filter((o) => !(o as unknown as { is_test?: boolean }).is_test) : orders),
    [orders, hideTests],
  );
  const filteredOrders = useMemo(() => filterOrdersByMode(visibleOrders, viewMode), [visibleOrders, viewMode]);
  const visibleColumns = BASE_COLUMNS;
  const getOrdersByStatus = (status: OrderStatus) =>
    filteredOrders.filter((o) => panelColumnStatus(o.status) === status);
  const detailOrder = detailOrderId ? orders.find((o) => o.id === detailOrderId) ?? null : null;

  const toggleHideTests = () => {
    setHideTests((v) => {
      const next = !v;
      try { localStorage.setItem("panel-hide-tests", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  const handleCleanupTests = async () => {
    if (!storeId) return;
    if (!confirm(`Apagar ${testOrdersCount} pedido(s) de teste desta loja? Esta ação não pode ser desfeita.`)) return;
    setCleaningTests(true);
    try {
      const { data, error } = await supabase.rpc("cleanup_test_orders", { _store_id: storeId, _older_than: null });
      if (error) throw error;
      const removed = (data as { deleted?: number } | null)?.deleted ?? 0;
      toast.success(`${removed} pedido(s) de teste removido(s)`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao limpar pedidos teste");
    } finally {
      setCleaningTests(false);
    }
  };

  const cardProps = (order: PanelOrder) => ({
    order,
    items: itemsByOrder[order.id] || [],
    needsAttention: isPendingOrderAlerting(order.id),
    viewerRole: roleData?.role,
    driverName: order.assigned_driver_id ? driverNameById.get(order.assigned_driver_id) : null,
    onAdvance: handleAdvance,
    onCancel: cancelOrder,
    onOpenDetail: openOrderDetail,
    onRequestAccept: openAcceptDialog,
    onRequestAssignDriver: openAssignDialog,
    onMarkPaid: markOrderPaid,
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> A carregar pedidos...
      </div>
    );
  }

  const mobileOrders = getOrdersByStatus(mobileTab);
  const isLive = mode === "live";

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
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-[80px]">
          {columnOrders.map((order) => (
            <OpsOrderCard key={order.id} {...cardProps(order)} />
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
      {mode === "live" && (
        <PanelAlertsPermissionDialog
          open={permissionOpen}
          storeId={storeId}
          onOpenChange={setPermissionOpen}
          onEnabled={() => setPermissionOpen(false)}
        />
      )}
      <OpsOrdersLayout
        variant={isLive ? "live" : "default"}
        columns={visibleColumns}
        orders={filteredOrders}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        connectionStatus={connectionStatus}
        headerExtra={
          <div className="space-y-2">
            <PanelAlertsBar storeId={storeId} />
            {printSummary?.printerEnabled && (
              <PanelPrintStatusBar
                summary={printSummary}
                loading={printLoading}
                onRetryFailed={retryFailed}
                onClearJobs={clearJobs}
                onRefresh={refreshPrint}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-0">
                <OpsModeFilter selected={viewMode} onSelect={setViewMode} orders={visibleOrders} />
              </div>
              {testOrdersCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={toggleHideTests}
                    className={`shrink-0 px-3 py-2 rounded-xl border-2 font-bold text-xs ${
                      hideTests
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border text-foreground"
                    }`}
                  >
                    {hideTests ? "👁 Mostrar testes" : "🚫 Ocultar testes"} ({testOrdersCount})
                  </button>
                  <button
                    type="button"
                    disabled={cleaningTests}
                    onClick={() => void handleCleanupTests()}
                    className="shrink-0 px-3 py-2 rounded-xl border-2 border-destructive text-destructive font-bold text-xs disabled:opacity-50"
                  >
                    {cleaningTests ? "A limpar..." : "🗑 Limpar testes"}
                  </button>
                </>
              )}
            </div>
          </div>
        }
      >
        <OpsStatusTabs columns={visibleColumns} orders={filteredOrders} selected={mobileTab} onSelect={setMobileTab} />

        <div className="md:hidden space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5">
          {mobileOrders.map((order) => (
            <OpsOrderCard key={order.id} {...cardProps(order)} />
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
        onRequestAssignDriver={openAssignDialog}
        viewerRole={roleData?.role}
        driverName={
          detailOrder?.assigned_driver_id
            ? driverNameById.get(detailOrder.assigned_driver_id)
            : undefined
        }
        onCancel={cancelOrder}
        onSetPrepMinutes={setPrepMinutes}
        onMarkPaid={(o, m) => {
          void markOrderPaid(o, m);
        }}
        onReprint={(o) => reprintOrder(o)}
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

      <OpsAssignDriverDialog
        order={assignOrder}
        drivers={drivers}
        loadingDrivers={loadingDrivers}
        open={!!assignOrder}
        onOpenChange={(open) => {
          if (!open) setAssignOrder(null);
        }}
        onConfirm={handleAssignDriver}
        assigning={assigning}
      />
    </>
  );
};

export default PanelOrdersBoard;
