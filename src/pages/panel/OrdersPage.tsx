import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, ChefHat, CheckCircle, Truck, XCircle, RefreshCw, User, Phone, Hash, Loader2, MapPin, Bike } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";
import { getNextAction, getStatusLabel } from "@/lib/orderStatusLabels";
import { playNewOrderAlert } from "@/lib/panelAlerts";
import { notifyOrderStatusChange } from "@/services/pushService";

type Order = Tables<"orders"> & {
  delivery_street?: string | null;
  delivery_city?: string | null;
  delivery_number?: string | null;
};
type OrderItem = Tables<"order_items">;
type OrderStatus = Database["public"]["Enums"]["order_status"] | "out_for_delivery";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  out_for_delivery: Bike,
  delivered: Truck,
  cancelled: XCircle,
};

const statusCardClass: Record<string, string> = {
  pending: "bg-red-500/15 border-red-500 ring-1 ring-red-500/30 animate-pulse",
  preparing: "bg-yellow-500/15 border-yellow-400",
  ready: "bg-green-500/15 border-green-500",
  out_for_delivery: "bg-blue-500/15 border-blue-500",
  delivered: "bg-muted/80 border-muted-foreground/20 opacity-75",
  cancelled: "bg-destructive/10 border-destructive/30",
};

const columns: OrderStatus[] = ["pending", "preparing", "ready", "out_for_delivery", "delivered"];

const OrdersPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const knownPendingRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const fetchOrders = async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      if (initializedRef.current) {
        for (const o of data) {
          if (o.status === "pending" && !knownPendingRef.current.has(o.id)) {
            playNewOrderAlert();
            toast.info(`Novo pedido #${o.order_number}`, { duration: 5000 });
          }
        }
      }
      knownPendingRef.current = new Set(data.filter((o) => o.status === "pending").map((o) => o.id));
      initializedRef.current = true;

      setOrders(data as Order[]);
      const ids = data.map((o) => o.id);
      if (ids.length) {
        const { data: items } = await supabase.from("order_items").select("*").in("order_id", ids);
        const map: Record<string, OrderItem[]> = {};
        (items || []).forEach((it) => {
          if (!map[it.order_id]) map[it.order_id] = [];
          map[it.order_id].push(it);
        });
        setItemsByOrder(map);
      } else {
        setItemsByOrder({});
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (storeId) {
      fetchOrders();
      const channel = supabase
        .channel("orders-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, fetchOrders)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [storeId]);

  const updateStatus = async (order: Order, newStatus: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as Database["public"]["Enums"]["order_status"] }).eq("id", order.id);
    if (error) {
      toast.error("Erro ao actualizar");
      return;
    }
    toast.success(`Pedido → ${getStatusLabel(newStatus, order.order_type)}`);
    await notifyOrderStatusChange(order.id, newStatus, order.order_number);
  };

  const cancelOrder = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    if (error) toast.error("Erro ao cancelar");
    else {
      toast.success("Pedido cancelado");
      if (order) await notifyOrderStatusChange(orderId, "cancelled", order.order_number);
    }
  };

  const getSourceLabel = (source: string) => {
    const map: Record<string, string> = { totem: "App", ifood: "iFood", counter: "Balcão", delivery: "Delivery", waiter: "Garçon" };
    return map[source] || source;
  };

  const visibleColumns = columns.filter((col) =>
    col !== "out_for_delivery" || orders.some((o) => o.status === "out_for_delivery" || (o.order_type === "delivery" && o.status === "ready")),
  );

  const getOrdersByStatus = (status: OrderStatus) => orders.filter((o) => o.status === status);

  if (!storeId) {
    return <div className="p-8 text-muted-foreground">Nenhuma loja vinculada.</div>;
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> A carregar pedidos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pedidos activos</h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="h-4 w-4 mr-1" /> Actualizar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {visibleColumns.map((status) => {
          const Icon = statusIcons[status] || Clock;
          return (
            <Card key={status}>
              <CardContent className="p-3">
                <p className="text-2xl font-bold">{getOrdersByStatus(status).length}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="w-3 h-3" /> {getStatusLabel(status)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${Math.min(visibleColumns.length, 5)} gap-4`} style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}>
        {visibleColumns.map((status) => {
          const Icon = statusIcons[status] || Clock;
          const columnOrders = getOrdersByStatus(status);
          return (
            <div key={status} className="space-y-3 min-w-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Icon className="h-4 w-4" /> {getStatusLabel(status)}
                <Badge variant="secondary" className="ml-auto">{columnOrders.length}</Badge>
              </h3>
              <div className="space-y-3 min-h-[120px]">
                {columnOrders.map((order) => {
                  const items = itemsByOrder[order.id] || [];
                  const isTable = order.order_type === "dine_in" && order.table_number;
                  const next = getNextAction(order.status, order.order_type);
                  const cardClass = statusCardClass[order.status] || "border-border";
                  return (
                    <Card key={order.id} className={`overflow-hidden border-2 ${cardClass}`}>
                      <CardContent className="p-4 space-y-3">
                        {isTable && (
                          <p className="text-3xl font-black text-primary leading-none text-center py-1">
                            Mesa {order.table_number}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xl">#{order.order_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs flex-wrap">
                          <Badge variant="outline">{getSourceLabel(order.source || "totem")}</Badge>
                          <Badge variant="outline">{order.order_type === "delivery" ? "Delivery" : order.order_type === "takeaway" ? "Takeaway" : "Mesa"}</Badge>
                          {(order as Order & { payment_status?: string }).payment_status === "paid" && <Badge className="bg-green-600">Pago</Badge>}
                        </div>
                        {order.customer_name && (
                          <div className="flex items-center gap-1.5 text-sm"><User className="w-3.5 h-3.5" />{order.customer_name}</div>
                        )}
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{order.customer_phone}</div>
                        )}
                        {order.delivery_street && (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{order.delivery_street} {order.delivery_number}, {order.delivery_city}</span>
                          </div>
                        )}
                        <ul className="text-xs space-y-1 border-t pt-2 max-h-28 overflow-y-auto">
                          {items.map((it) => (
                            <li key={it.id} className="flex justify-between gap-2">
                              <span className="truncate">{it.quantity}x {it.product_name}</span>
                              <span className="font-bold shrink-0">€{Number(it.total_price).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between font-black text-lg text-primary">
                          <span>Total</span>
                          <span>€ {Number(order.total).toFixed(2)}</span>
                        </div>
                        {next && (
                          <Button size="lg" className="w-full h-12 font-black text-base" onClick={() => updateStatus(order, next.next)}>
                            {next.label}
                          </Button>
                        )}
                        {status === "pending" && (
                          <Button size="sm" variant="destructive" className="w-full" onClick={() => cancelOrder(order.id)}>
                            <XCircle className="h-4 w-4 mr-1" /> Cancelar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {columnOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">Nenhum pedido</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;
