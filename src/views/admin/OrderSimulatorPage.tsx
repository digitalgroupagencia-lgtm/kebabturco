import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coffee, ShoppingBag, Truck, Bell, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { playTestAlert } from "@/lib/panelAlerts";

type Store = { id: string; name: string };
type Table = { id: string; number: string };

const STATUS_FLOW = ["pending", "preparing", "ready", "out_for_delivery", "delivered"] as const;

export default function OrderSimulatorPage() {
  const { role, loading: roleLoading } = useUserRole();
  const isAdmin = role === "admin_master";

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [tables, setTables] = useState<Table[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [simLog, setSimLog] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("stores").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      if (data) {
        setStores(data);
        if (data.length > 0 && !storeId) setStoreId(data[0].id);
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!storeId) return;
    supabase.from("tables").select("id, number").eq("store_id", storeId).eq("is_active", true).order("number").then(({ data }) => {
      setTables(data || []);
      setTableId(data && data[0] ? data[0].id : "");
    });
  }, [storeId]);

  const callSimulator = async (mode: "dine_in" | "takeaway" | "delivery", extra: Record<string, unknown> = {}) => {
    if (!storeId) {
      toast.error("Seleciona uma loja primeiro");
      return null;
    }
    setBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-test-order", {
        body: { storeId, mode, ...extra },
      });
      if (error) throw error;
      toast.success(`Pedido teste #${data.orderNumber} criado`);
      return data as { orderId: string; orderNumber: string };
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar pedido teste");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleDineIn = async () => {
    const table = tables.find((t) => t.id === tableId);
    await callSimulator("dine_in", { tableId, tableNumber: table?.number });
  };

  const handleTakeaway = async () => callSimulator("takeaway");
  const handleDelivery = async () => callSimulator("delivery");

  const handleTestNotifications = async () => {
    setBusy("notif");
    try {
      await playTestAlert();
      if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 500]);
      if (storeId) {
        await supabase.functions.invoke("send-push-notification", {
          body: { storeId, title: "[TESTE] Notificação", body: "Teste de notificação do simulador", tag: `test-notif-${Date.now()}`, url: "/panel/live" },
        });
      }
      toast.success("Som, vibração e push disparados");
    } catch (e: any) {
      toast.error(e.message || "Erro no teste");
    } finally {
      setBusy(null);
    }
  };

  const handleFullSimulation = async () => {
    setSimLog([]);
    const log = (msg: string) => setSimLog((l) => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);
    const order = await callSimulator("delivery");
    if (!order) return;
    setBusy("full");
    log(`Pedido #${order.orderNumber} criado (pending)`);
    for (const status of ["preparing", "ready", "out_for_delivery", "delivered"]) {
      await new Promise((r) => setTimeout(r, 4000));
      const { error } = await supabase.rpc("advance_test_order_status", { _order_id: order.orderId, _new_status: status });
      if (error) {
        log(`Erro: ${error.message}`);
        break;
      }
      log(`Status → ${status}`);
    }
    log("Simulação completa concluída");
    setBusy(null);
  };

  const handleCleanup = async () => {
    if (!confirm("Apagar TODOS os pedidos de teste? Esta acção não pode ser desfeita.")) return;
    setBusy("cleanup");
    const { data, error } = await supabase.rpc("cleanup_test_orders", { _store_id: storeId || null, _older_than: null });
    setBusy(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${(data as any)?.deleted ?? 0} pedidos de teste removidos`);
    }
  };

  if (roleLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> A carregar…</div>;
  if (!isAdmin) return <div className="p-8 text-muted-foreground">Acesso restrito a admin_master.</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Simulador de Pedidos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramenta de testes operacionais. Os pedidos criados aqui aparecem com a tag <Badge className="bg-yellow-500 text-black mx-1">[TESTE]</Badge>
          e <strong>não entram</strong> em faturamento, relatórios, estatísticas, ranking ou estoque.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loja a testar</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
            <SelectContent>
              {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Coffee className="h-4 w-4" /> Pedido Teste — Mesa</CardTitle>
            <CardDescription>Dispara fluxo completo de pedido em mesa (operador, cozinha, impressora).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={tableId} onValueChange={setTableId} disabled={tables.length === 0}>
              <SelectTrigger><SelectValue placeholder={tables.length ? "Selecionar mesa" : "Sem mesas activas"} /></SelectTrigger>
              <SelectContent>
                {tables.map((t) => <SelectItem key={t.id} value={t.id}>Mesa {t.number}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleDineIn} disabled={!!busy || !tableId} className="w-full">
              {busy === "dine_in" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Pedido Teste - Mesa"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Pedido Teste — Balcão</CardTitle>
            <CardDescription>Cria pedido de balcão (takeaway) e dispara impressão + notificações.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTakeaway} disabled={!!busy} className="w-full">
              {busy === "takeaway" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Pedido Teste - Balcão"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Pedido Teste — Delivery</CardTitle>
            <CardDescription>Pedido de entrega com endereço fake. Valida fluxo do entregador.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDelivery} disabled={!!busy} className="w-full">
              {busy === "delivery" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Pedido Teste - Delivery"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Testar Notificações</CardTitle>
            <CardDescription>Dispara som, vibração e push sem criar pedido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTestNotifications} disabled={!!busy} variant="secondary" className="w-full">
              {busy === "notif" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar Notificações"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Play className="h-4 w-4" /> Simulação Completa Automática</CardTitle>
          <CardDescription>Cria pedido delivery e avança por todos os status (pending → preparing → ready → out_for_delivery → delivered) a cada 4s.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleFullSimulation} disabled={!!busy} className="w-full">
            {busy === "full" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Executar Simulação Completa"}
          </Button>
          {simLog.length > 0 && (
            <div className="bg-muted rounded-md p-3 text-xs font-mono space-y-1 max-h-60 overflow-auto">
              {simLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Limpeza</CardTitle>
          <CardDescription>Remove permanentemente todos os pedidos com tag [TESTE] da loja selecionada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCleanup} disabled={!!busy} variant="destructive">
            {busy === "cleanup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Limpar Pedidos de Teste"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
