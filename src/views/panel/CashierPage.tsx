import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CreditCard, Banknote, Smartphone, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { markOrderPaidAtCounter } from "@/services/orderService";
import { tryPrintPanelOrder } from "@/features/ops/panelPrintHelper";
import { useStaffT } from "@/hooks/useStaffT";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import PremiumMetricCard from "@/components/admin/premium/PremiumMetricCard";
import { useDemoMode } from "@/lib/demoMode";
import { DEMO_PANEL_CASHIER } from "@/lib/demoData";

type CashRegister = Tables<"cash_registers">;
type PendingOrder = Tables<"orders">;

const CashierPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;
  const { t } = useStaffT();
  const demoOn = useDemoMode();


  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [todaySalesReal, setTodaySales] = useState({ total: 0, card: 0, cash: 0, pix: 0, count: 0 });
  const [pendingOrdersReal, setPendingOrders] = useState<PendingOrder[]>([]);
  const todaySales = demoOn
    ? { total: DEMO_PANEL_CASHIER.total, card: DEMO_PANEL_CASHIER.card, cash: DEMO_PANEL_CASHIER.cash, pix: DEMO_PANEL_CASHIER.pix, count: DEMO_PANEL_CASHIER.count }
    : todaySalesReal;
  const pendingOrders: PendingOrder[] = demoOn
    ? (DEMO_PANEL_CASHIER.pendingOrders as unknown as PendingOrder[])
    : pendingOrdersReal;
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchPendingOrders = useCallback(async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("store_id", storeId)
      .eq("payment_status", "pending")
      .neq("status", "cancelled")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });
    setPendingOrders((data ?? []) as PendingOrder[]);
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchCurrentRegister();
      fetchTodaySales();
      fetchPendingOrders();
    }
  }, [storeId, fetchPendingOrders]);

  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`cashier-orders-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` }, () => {
        fetchPendingOrders();
        fetchTodaySales();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId, fetchPendingOrders]);

  const confirmCashPayment = async (order: PendingOrder, method: "cash" | "card" = "cash") => {
    setConfirmingId(order.id);
    try {
      await markOrderPaidAtCounter(order.id, method);
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order.id);
      await tryPrintPanelOrder(storeId!, { ...order, payment_status: "paid", payment_method: method } as any, (items ?? []) as any);
      toast.success(`${t("toast.payment_registered")} — #${order.order_number}`);
      await Promise.all([fetchPendingOrders(), fetchTodaySales()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toast.payment_error"));
    } finally {
      setConfirmingId(null);

    }
  };

  const fetchCurrentRegister = async () => {
    if (!storeId) return;
    const { data } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("store_id", storeId)
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCurrentRegister(data);
    setLoading(false);
  };

  const fetchTodaySales = async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("orders")
      .select("total, payment_method")
      .eq("store_id", storeId)
      .neq("status", "cancelled")
      .gte("created_at", today.toISOString());

    if (data) {
      const total = data.reduce((s, o) => s + Number(o.total), 0);
      const card = data.filter((o) => o.payment_method === "card").reduce((s, o) => s + Number(o.total), 0);
      const cash = data.filter((o) => o.payment_method === "cash").reduce((s, o) => s + Number(o.total), 0);
      const pix = data.filter((o) => o.payment_method === "pix").reduce((s, o) => s + Number(o.total), 0);
      setTodaySales({ total, card, cash, pix, count: data.length });
    }
  };

  const openRegister = async () => {
    if (!storeId || !user) return;
    const { error } = await supabase.from("cash_registers").insert({
      store_id: storeId,
      opened_by: user.id,
      opening_balance: parseFloat(openingBalance) || 0,
    });

    if (error) {
      toast.error(t("toast.cash_open_error"));
    } else {
      toast.success(t("toast.cash_opened"));
      setOpenDialogVisible(false);
      fetchCurrentRegister();
    }

  };

  const closeRegister = async () => {
    if (!currentRegister || !user) return;
    const { error } = await supabase
      .from("cash_registers")
      .update({
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closing_balance: parseFloat(closingBalance) || 0,
        total_sales: todaySales.total,
      })
      .eq("id", currentRegister.id);

    if (error) {
      toast.error(t("toast.cash_close_error"));
    } else {
      toast.success(t("toast.cash_closed"));
      setCloseDialogVisible(false);
      fetchCurrentRegister();
    }

  };

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("cashier.title")}</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t("common.no_store")}</CardContent></Card>
      </div>

    );
  }

  return (
    <div className="space-y-6">
      <HowToUsePanel
        purpose="Controla a abertura e fecho do caixa do dia, e confirma os pagamentos em dinheiro no balcão."
        whenToUse="Abra ao iniciar o expediente. Feche no fim do dia para conferir o que entrou."
        steps={[
          "Toque em Abrir caixa e digite o valor inicial (troco).",
          "Durante o dia, os pedidos pagos em dinheiro caem na lista de Pendentes — confirme cada um.",
          "No fim do dia, toque Fechar caixa e digite o valor real contado.",
          "O sistema mostra a diferença entre o esperado e o contado.",
        ]}
        howToConfirm="Se o total de vendas no fecho bater com o caixa físico, está certo. Se sobrar ou faltar muito, revise pedidos cancelados."
        assistantQuestion="Por que existe a tela de Caixa e o que acontece se eu não abrir/fechar?"
      />
      <PremiumPageHeader
        icon={DollarSign}
        title={t("cashier.title")}
        subtitle={currentRegister ? t("cashier.state.open") : t("cashier.state.closed")}
        actions={
          !currentRegister ? (
            <Button onClick={() => setOpenDialogVisible(true)} className="bg-success hover:bg-success/90 h-9">
              <ArrowUpCircle className="h-4 w-4 mr-1" /> {t("cashier.action.open")}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setCloseDialogVisible(true)} className="h-9">
              <ArrowDownCircle className="h-4 w-4 mr-1" /> {t("cashier.action.close")}
            </Button>
          )
        }
      />

      {/* Status */}
      <Card className={currentRegister ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${currentRegister ? "bg-success animate-pulse" : "bg-destructive"}`} />
          <span className="font-semibold">
            {currentRegister ? t("cashier.state.open") : t("cashier.state.closed")}
          </span>
          {currentRegister && (
            <span className="text-sm text-muted-foreground ml-auto">
              <Clock className="inline h-3 w-3 mr-1" />
              {t("cashier.openedAt")} {new Date(currentRegister.opened_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </CardContent>
      </Card>


      {/* Sales summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PremiumMetricCard
          icon={DollarSign}
          label={t("cashier.total.today")}
          value={`€ ${todaySales.total.toFixed(2)}`}
          sub={`${todaySales.count} ${t("cashier.orders.count")}`}
          tone="success"
        />
        <PremiumMetricCard
          icon={CreditCard}
          label={t("cashier.method.card")}
          value={`€ ${todaySales.card.toFixed(2)}`}
          tone="info"
        />
        <PremiumMetricCard
          icon={Banknote}
          label={t("cashier.method.cash")}
          value={`€ ${todaySales.cash.toFixed(2)}`}
          tone="warning"
        />
        <PremiumMetricCard
          icon={Smartphone}
          label={t("cashier.method.pix")}
          value={`€ ${todaySales.pix.toFixed(2)}`}
          tone="purple"
        />
      </div>



      {/* Pending Payments */}
      <Card className={pendingOrders.length > 0 ? "border-yellow-500/60 bg-yellow-500/5" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${pendingOrders.length > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
            {t("cashier.pending.title")}
            <Badge variant={pendingOrders.length > 0 ? "default" : "secondary"} className="ml-auto">
              {pendingOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("cashier.pending.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {pendingOrders.map((o) => {
                const modality = o.order_type === "delivery"
                  ? t("order.modality.delivery")
                  : o.order_type === "dine_in"
                    ? `${t("order.modality.table")} ${o.table_number ?? ""}`
                    : t("order.modality.pickup");
                return (
                  <li key={o.id} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">#{o.order_number}</span>
                        <Badge variant="outline" className="h-5 text-[10px]">{modality}</Badge>
                        <span className="text-xs text-muted-foreground truncate">{o.customer_name || t("common.customer")}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(o.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {" · "}Status: <span className="font-semibold">{o.status}</span>
                      </p>
                    </div>
                    <span className="font-black text-primary text-base tabular-nums shrink-0">€{Number(o.total).toFixed(2)}</span>
                    <Button
                      size="sm"
                      className="h-9 bg-green-600 hover:bg-green-700 text-white"
                      disabled={confirmingId === o.id}
                      onClick={() => void confirmCashPayment(o, "cash")}
                    >
                      <Banknote className="h-4 w-4 mr-1" />
                      {t("cashier.method.cash")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      disabled={confirmingId === o.id}
                      onClick={() => void confirmCashPayment(o, "card")}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      {t("cashier.method.card")}
                    </Button>
                  </li>
                );
              })}
            </ul>

          )}
        </CardContent>
      </Card>

      {currentRegister && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("cashier.shift.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("cashier.balance.opening")}</span>
              <span className="font-semibold">€ {Number(currentRegister.opening_balance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("cashier.sales.cash")}</span>
              <span className="font-semibold text-success">+ € {todaySales.cash.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">{t("cashier.balance.expected")}</span>
              <span className="font-bold text-lg">€ {(Number(currentRegister.opening_balance) + todaySales.cash).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Dialog */}
      <Dialog open={openDialogVisible} onOpenChange={setOpenDialogVisible}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("cashier.action.open")}</DialogTitle></DialogHeader>
          <div>
            <Label>{t("cashier.balance.opening.input")}</Label>
            <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button onClick={openRegister}>{t("cashier.action.open")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeDialogVisible} onOpenChange={setCloseDialogVisible}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("cashier.action.close")}</DialogTitle></DialogHeader>
          <div>
            <Label>{t("cashier.balance.closing.input")}</Label>
            <Input type="number" step="0.01" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("cashier.today.sold")} <strong>€ {todaySales.total.toFixed(2)}</strong>
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t("common.cancel")}</Button></DialogClose>
            <Button variant="destructive" onClick={closeRegister}>{t("cashier.action.close")}</Button>
          </DialogFooter>
        </DialogContent>

      </Dialog>
    </div>
  );
};

export default CashierPage;
