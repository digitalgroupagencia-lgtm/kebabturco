import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CreditCard, Banknote, Smartphone, AlertCircle, Printer, ReceiptText } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { markOrderPaidAtCounter } from "@/services/orderService";
import { tryPrintPanelOrder } from "@/features/ops/panelPrintHelper";
import { useStaffT } from "@/hooks/useStaffT";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";
import { PremiumStatusBadge } from "@/components/premium/PremiumStatusBadge";
import { PremiumTable } from "@/components/premium/PremiumTable";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";

type CashRegister = Tables<"cash_registers">;
type PendingOrder = Tables<"orders">;
type OrderItem = Tables<"order_items">;

const CashierPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;
  const { t } = useStaffT();


  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [todaySales, setTodaySales] = useState({ total: 0, card: 0, cash: 0, pix: 0, count: 0 });
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
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
      const printableOrder = { ...order, payment_status: "paid", payment_method: method } as unknown as Parameters<typeof tryPrintPanelOrder>[1];
      const printableItems = (items ?? []) as unknown as OrderItem[];
      await tryPrintPanelOrder(storeId!, printableOrder, printableItems);
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
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title={t("cashier.title")}
        subtitle="Gestão de abertura, encerramento e movimentações do caixa"
        actions={
          <>
            {!currentRegister ? (
              <PremiumActionButton onClick={() => setOpenDialogVisible(true)}>
                <ArrowUpCircle className="h-4 w-4 mr-1" /> {t("cashier.action.open")}
              </PremiumActionButton>
            ) : (
              <PremiumActionButton onClick={() => setCloseDialogVisible(true)} className="from-[#B91C1C] to-[#D62300]">
                <ArrowDownCircle className="h-4 w-4 mr-1" /> {t("cashier.action.close")}
              </PremiumActionButton>
            )}
          </>
        }
      />

      <PremiumCard className={currentRegister ? "border-success/50 bg-success/5 text-white" : "border-destructive/50 bg-destructive/5 text-white"}>
        <div className="p-0 flex items-center gap-3">
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
        </div>
      </PremiumCard>


      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-9">
        <PremiumMetricCard title="Caixa" value={currentRegister ? "Aberto" : "Fechado"} subtitle="estado atual" icon={DollarSign} color={currentRegister ? "green" : "red"} />
        <PremiumMetricCard title="Saldo inicial" value={`€ ${Number(currentRegister?.opening_balance || 0).toFixed(2)}`} subtitle="abertura" icon={ArrowUpCircle} color="blue" />
        <PremiumMetricCard title="Vendas dinheiro" value={`€ ${todaySales.cash.toFixed(2)}`} subtitle="hoje" icon={Banknote} color="green" />
        <PremiumMetricCard title="Vendas cartão" value={`€ ${todaySales.card.toFixed(2)}`} subtitle="hoje" icon={CreditCard} color="purple" />
        <PremiumMetricCard title="Vendas online" value={`€ ${todaySales.pix.toFixed(2)}`} subtitle="hoje" icon={Smartphone} color="orange" />
        <PremiumMetricCard title="Sangrias" value="€ 0,00" subtitle="sem registos" icon={ArrowDownCircle} color="red" />
        <PremiumMetricCard title="Suprimentos" value="€ 0,00" subtitle="sem registos" icon={ArrowUpCircle} color="blue" />
        <PremiumMetricCard title="Saldo esperado" value={`€ ${(Number(currentRegister?.opening_balance || 0) + todaySales.cash).toFixed(2)}`} subtitle="estimativa" icon={ReceiptText} color="brand" />
        <PremiumMetricCard title="Divergência" value="€ 0,00" subtitle="a conferir" icon={AlertCircle} color="yellow" />
      </section>


      {/* Pending Payments */}
      <PremiumCard
        title={t("cashier.pending.title")}
        className={pendingOrders.length > 0 ? "border-yellow-500/60 bg-yellow-500/5 text-white" : "bg-[#111111]"}
        action={<PremiumStatusBadge status={pendingOrders.length > 0 ? "warning" : "neutral"}>{pendingOrders.length}</PremiumStatusBadge>}
      >
        <div>
          {pendingOrders.length === 0 ? (
            <PremiumEmptyState icon={AlertCircle} title="Sem pagamentos pendentes" description={t("cashier.pending.empty")} />
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
                    <PremiumActionButton
                      size="sm"
                      className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white"
                      disabled={confirmingId === o.id}
                      onClick={() => void confirmCashPayment(o, "cash")}
                    >
                      <Banknote className="h-4 w-4 mr-1" />
                      {t("cashier.method.cash")}
                    </PremiumActionButton>
                    <PremiumActionButton
                      className="h-9 px-3"
                      tone="secondary"
                      disabled={confirmingId === o.id}
                      onClick={() => void confirmCashPayment(o, "card")}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      {t("cashier.method.card")}
                    </PremiumActionButton>
                  </li>
                );
              })}
            </ul>

          )}
        </div>
      </PremiumCard>

      <PremiumTable
        title="Movimentações do caixa"
        subtitle="Registos de entradas e métodos"
        rows={pendingOrders}
        columns={[
          { key: "pedido", label: "Pedido", render: (row) => `#${row.order_number}` },
          { key: "cliente", label: "Cliente", render: (row) => row.customer_name || "Cliente" },
          { key: "estado", label: "Estado", render: (row) => row.status },
          { key: "total", label: "Total", render: (row) => `€ ${Number(row.total).toFixed(2)}` },
          { key: "hora", label: "Hora", render: (row) => new Date(row.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) },
        ]}
      />

      {currentRegister && (
        <PremiumCard title={t("cashier.shift.title")} className="bg-[#111111]">
          <div className="space-y-2">
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
          </div>
        </PremiumCard>
      )}

      <PremiumCard title="Ações rápidas" className="bg-[#111111]">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <PremiumActionButton onClick={() => setOpenDialogVisible(true)}>
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Abrir caixa
          </PremiumActionButton>
          <PremiumActionButton className="from-[#B91C1C] to-[#D62300]" onClick={() => setCloseDialogVisible(true)}>
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Fechar caixa
          </PremiumActionButton>
          <PremiumActionButton tone="secondary">
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Sangria
          </PremiumActionButton>
          <PremiumActionButton tone="secondary">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Suprimento
          </PremiumActionButton>
          <PremiumActionButton tone="secondary">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir resumo
          </PremiumActionButton>
        </div>
      </PremiumCard>

      {/* Open Dialog */}
      <Dialog open={openDialogVisible} onOpenChange={setOpenDialogVisible}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("cashier.action.open")}</DialogTitle></DialogHeader>
          <div>
            <Label>{t("cashier.balance.opening.input")}</Label>
            <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <DialogClose asChild><PremiumActionButton tone="secondary">{t("common.cancel")}</PremiumActionButton></DialogClose>
            <PremiumActionButton onClick={openRegister}>{t("cashier.action.open")}</PremiumActionButton>
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
            <DialogClose asChild><PremiumActionButton tone="secondary">{t("common.cancel")}</PremiumActionButton></DialogClose>
            <PremiumActionButton className="from-[#B91C1C] to-[#D62300]" onClick={closeRegister}>{t("cashier.action.close")}</PremiumActionButton>
          </DialogFooter>
        </DialogContent>

      </Dialog>
    </div>
  );
};

export default CashierPage;
