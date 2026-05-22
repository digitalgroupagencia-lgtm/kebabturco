import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, ChefHat, CheckCircle, Truck, XCircle, RefreshCw, User, Phone, Hash, Loader2 } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;
type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusConfig: Record<OrderStatus, { label: string; cardClass: string; icon: React.ElementType; next?: OrderStatus; action?: string }> = {
  pending: { label: "Novo", cardClass: "bg-red-500/15 border-red-500 ring-1 ring-red-500/30 animate-pulse", icon: Clock, next: "preparing", action: "OK / Em preparação" },
  preparing: { label: "Em preparação", cardClass: "bg-yellow-500/15 border-yellow-400", icon: ChefHat, next: "ready", action: "Pronto para servir" },
  ready: { label: "Pronto para servir", cardClass: "bg-green-500/15 border-green-500", icon: CheckCircle, next: "delivered", action: "Entregue na mesa" },
  delivered: { label: "Entregue na mesa", cardClass: "bg-muted/80 border-muted-foreground/20 opacity-75", icon: Truck },
  cancelled: { label: "Cancelado", cardClass: "bg-destructive/10 border-destructive/30", icon: XCircle },
};

const columns: OrderStatus[] = ["pending", "preparing", "ready", "delivered"];

const OrdersPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);

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
      setOrders(data);
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

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) toast.error("Erro ao actualizar");
    else toast.success(`Pedido → ${statusConfig[newStatus].label}`);
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    if (error) toast.error("Erro ao cancelar");
    else toast.success("Pedido cancelado");
  };

  const getSourceLabel = (source: string) => {
    const map: Record<string, string> = { totem: "App", ifood: "iFood", counter: "Balcão", delivery: "Delivery", waiter: "Garçon" };
    return map[source] || source;
  };

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {columns.map((status) => (
          <Card key={status}>
            <CardContent className="p-3">
              <p className="text-2xl font-bold">{getOrdersByStatus(status).length}</p>
              <p className="text-xs text-muted-foreground">{statusConfig[status].label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((status) => {
          const config = statusConfig[status];
          const columnOrders = getOrdersByStatus(status);
          return (
            <div key={status} className="space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <config.icon className="h-4 w-4" /> {config.label}
                <Badge variant="secondary" className="ml-auto">{columnOrders.length}</Badge>
              </h3>
              <div className="space-y-3 min-h-[120px]">
                {columnOrders.map((order) => {
                  const items = itemsByOrder[order.id] || [];
                  const isTable = order.order_type === "dine_in" && order.table_number;
                  return (
                    <Card key={order.id} className={`overflow-hidden border-2 ${config.cardClass}`}>
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
                          {(order as any).payment_status === "paid" && <Badge className="bg-green-600">Pago</Badge>}
                        </div>
                        {order.customer_name && (
                          <div className="flex items-center gap-1.5 text-sm"><User className="w-3.5 h-3.5" />{order.customer_name}</div>
                        )}
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{order.customer_phone}</div>
                        )}
                        {!isTable && order.table_number && (
                          <div className="flex items-center gap-1.5 text-sm"><Hash className="w-3.5 h-3.5" />Mesa {order.table_number}</div>
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
                        {config.next && (
                          <Button size="lg" className="w-full h-12 font-black text-base" onClick={() => updateStatus(order.id, config.next!)}>
                            {config.action}
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
