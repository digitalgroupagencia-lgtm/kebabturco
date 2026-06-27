import { useEffect, useState } from "react";
import { Loader2, Send, User, Phone, Truck, Store, CheckCircle2, Banknote, QrCode, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/customer/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useSellerMode } from "@/contexts/SellerModeContext";
import { supabase } from "@/integrations/supabase/client";
import { nav } from "@/lib/navPaths";
import { useSellerPayment } from "@/hooks/useSellerPayment";
import { useStaffT } from "@/hooks/useStaffT";
import SellerMesaQrDialog from "./SellerMesaQrDialog";
import {
  clearSellerSession,
  loadSellerSession,
  saveSellerCheckoutDraft,
} from "@/lib/sellerSession";
import { cancelSellerPendingOrder } from "@/services/sellerOrderService";

type OrderTypeChoice = "dine_in" | "takeaway";

type SavedOrder = {
  id: string;
  order_number: string;
  total: number;
  customer_email?: string | null;
};

const SellerCheckoutForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useStaffT();
  const { items, totalPrice, clearCart } = useCart();
  const { storeId, setScreen } = useOrder();
  const { sellerId, sellerName } = useSellerMode();

  const savedDraft = loadSellerSession()?.checkout;

  const [customerName, setCustomerName] = useState(savedDraft?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(savedDraft?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(savedDraft?.customerEmail ?? "");
  const [tableNumber, setTableNumber] = useState(savedDraft?.tableNumber ?? "");
  const [type, setType] = useState<OrderTypeChoice>(savedDraft?.type ?? "dine_in");
  const [notes, setNotes] = useState(savedDraft?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [savedOrder, setSavedOrder] = useState<SavedOrder | null>(savedDraft?.savedOrder ?? null);
  const [mesaQrOpen, setMesaQrOpen] = useState(false);

  useEffect(() => {
    saveSellerCheckoutDraft({
      customerName,
      customerPhone,
      customerEmail,
      tableNumber,
      type,
      notes,
      savedOrder,
    });
  }, [customerName, customerPhone, customerEmail, tableNumber, type, notes, savedOrder]);

  useEffect(() => {
    const table = searchParams.get("table")?.trim();
    const customer = searchParams.get("customer")?.trim();
    if (table) {
      setTableNumber(table);
      setType("dine_in");
    }
    if (customer) setCustomerName(customer);
  }, [searchParams]);

  const applyMesa = (tableNum: string) => {
    setTableNumber(tableNum);
    setType("dine_in");
  };

  const buildRpcItems = (): any =>
    items.map((it) => ({
      product_id: it.productId,
      product_name:
        (it.productName?.pt as string) ||
        (it.productName?.es as string) ||
        (it.productName?.en as string) ||
        "Produto",
      quantity: it.quantity,
      unit_price: Number(it.unitPrice ?? it.basePrice ?? 0),
      size_name: it.sizeName
        ? ((it.sizeName.pt as string) || (it.sizeName.es as string) || null)
        : null,
      extras: (it.extras ?? []) as unknown[],
      removed: (it.removedIngredients ?? []) as unknown[],
      notes: it.note ?? null,
    }));


  const isMissingRpc = (message: string) =>
    /create_seller_counter_order|could not find the function|42883/i.test(message);

  const createCounterOrderFallback = async () => {
    const { data: orderNumber, error: numError } = await supabase.rpc("next_order_number", {
      _store_id: storeId!,
    });
    if (numError) throw numError;

    const { data: orderRow, error } = await supabase
      .from("orders")
      .insert({
        store_id: storeId,
        order_number: String(orderNumber),
        order_type: type,
        status: "pending",
        payment_status: "pending",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        notes: notes.trim() || null,
        subtotal: totalPrice,
        total: totalPrice,
        seller_id: sellerId,
        source: "counter",
      })
      .select("id, order_number, total, customer_email")
      .single();
    if (error) throw error;

    const itemsPayload = items.map((it) => ({
      order_id: orderRow.id,
      product_id: it.productId,
      product_name:
        (it.productName?.pt as string) ||
        (it.productName?.es as string) ||
        (it.productName?.en as string) ||
        "Produto",
      quantity: it.quantity,
      unit_price: Number(it.unitPrice ?? it.basePrice ?? 0),
      total_price: Number(it.totalPrice ?? (it.unitPrice ?? it.basePrice ?? 0) * it.quantity),
      size_name: it.sizeName
        ? ((it.sizeName.pt as string) || (it.sizeName.es as string) || null)
        : null,
      selections: (it.selections ?? []) as any,
      extras: (it.extras ?? []) as any,
      removed: (it.removedIngredients ?? []) as any,
      notes: it.note ?? null,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload as any);
    if (itemsError) throw itemsError;

    return {
      order_id: orderRow.id,
      order_number: orderRow.order_number,
      total: Number(orderRow.total ?? totalPrice),
      customer_email: orderRow.customer_email,
    };
  };

  const createCounterOrder = async () => {
    const { data, error } = await supabase.rpc("create_seller_counter_order", {
      _store_id: storeId!,
      _customer_name: customerName.trim(),
      _items: buildRpcItems(),
      _notes: notes.trim() || null,
      _customer_phone: customerPhone.trim() || null,
      _customer_email: customerEmail.trim() || null,
      _order_type: type,
    });

    if (!error && data) {
      const result = data as {
        order_id?: string;
        order_number?: string;
        total?: number;
      };
      if (!result.order_id) throw new Error("Pedido não criado");
      return {
        order_id: result.order_id,
        order_number: String(result.order_number ?? ""),
        total: Number(result.total ?? totalPrice),
        customer_email: customerEmail.trim() || null,
      };
    }

    if (error && !isMissingRpc(error.message ?? "")) throw error;
    return createCounterOrderFallback();
  };

  const { payCash, payCard, SellerPaymentDialogs, canPayCard } = useSellerPayment({
    storeId: storeId ?? "",
    onSuccess: () => {
      toast.success(t("tapToPay.step.success"));
      clearSellerSession();
      clearCart();
      setScreen("home");
      setSavedOrder(null);
      navigate(nav.seller());
    },
    onDemoDismissed: async (order) => {
      try {
        await cancelSellerPendingOrder(order.id);
      } catch (e) {
        console.warn("[seller] cancel demo order failed", e);
      }
      setSavedOrder(null);
      saveSellerCheckoutDraft({
        customerName,
        customerPhone,
        customerEmail,
        tableNumber,
        type,
        notes,
        savedOrder: null,
      });
    },
  });

  const discardDraft = async () => {
    if (savedOrder?.id) {
      try {
        await cancelSellerPendingOrder(savedOrder.id);
      } catch (e) {
        console.warn("[seller] cancel pending order failed", e);
      }
    }
    clearSellerSession();
    clearCart();
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setTableNumber("");
    setType("dine_in");
    setNotes("");
    setSavedOrder(null);
    setScreen("home");
    toast.success(t("seller.discard_order.done"));
  };

  const submit = async () => {
    if (!customerName.trim()) return toast.error("Informe o nome do cliente");
    if (type === "dine_in" && !tableNumber.trim()) return toast.error(t("seller.mesa.manual_required"));
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!storeId) return toast.error("Loja não identificada");

    setBusy(true);
    try {
      if (type === "dine_in") {
        const { data, error } = await supabase.rpc("create_seller_order", {
          _store_id: storeId,
          _table_number: tableNumber.trim(),
          _customer_name: customerName.trim(),
          _items: buildRpcItems(),
          _notes: notes.trim() || null,
        });
        if (error) throw error;

        const result = data as {
          order_id?: string;
          order_number?: string;
          total?: number;
        } | null;
        if (!result?.order_id) throw new Error("Pedido não criado");

        if (customerPhone.trim() || customerEmail.trim()) {
          await supabase
            .from("orders")
            .update({
              customer_phone: customerPhone.trim() || null,
              customer_email: customerEmail.trim() || null,
            })
            .eq("id", result.order_id);
        }

        const orderRow = {
          id: result.order_id,
          order_number: String(result.order_number ?? ""),
          total: Number(result.total ?? totalPrice),
          customer_email: customerEmail.trim() || null,
        };

        toast.success(`Pedido #${orderRow.order_number} registado · Mesa ${tableNumber.trim()}`);
        setSavedOrder(orderRow);
        return;
      }

      const counter = await createCounterOrder();

      toast.success(`Pedido #${counter.order_number} registado`);
      setSavedOrder({
        id: counter.order_id,
        order_number: counter.order_number,
        total: counter.total,
        customer_email: counter.customer_email,
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Falha ao registar pedido");
    } finally {
      setBusy(false);
    }
  };

  const finishWithoutCharge = () => {
    clearSellerSession();
    clearCart();
    setScreen("home");
    setSavedOrder(null);
    navigate(nav.seller());
  };

  const confirmCashPayment = async () => {
    if (!savedOrder) return;
    setBusy(true);
    try {
      const ok = await payCash({
        id: savedOrder.id,
        order_number: savedOrder.order_number,
        total: savedOrder.total,
        customer_email: savedOrder.customer_email,
      });
      if (ok) finishWithoutCharge();
    } finally {
      setBusy(false);
    }
  };

  const confirmCardPayment = async () => {
    if (!savedOrder) return;
    setBusy(true);
    try {
      await payCard({
        id: savedOrder.id,
        order_number: savedOrder.order_number,
        total: savedOrder.total,
        customer_email: savedOrder.customer_email,
      });
    } finally {
      setBusy(false);
    }
  };

  if (savedOrder) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-secondary/20 pb-20">
        <SellerPaymentDialogs />
        <div className="px-4 py-8 space-y-5 max-w-md mx-auto w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
              {t("tapToPay.seller.order_saved")}
            </p>
            <p className="text-3xl font-black mt-1">#{savedOrder.order_number}</p>
            <p className="text-2xl font-black text-primary mt-2 tabular-nums">
              {savedOrder.total.toFixed(2)}€
            </p>
          </div>

          <Button
            className="w-full h-14 font-black text-base"
            disabled={busy}
            onClick={() => void confirmCashPayment()}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Banknote className="h-5 w-5 mr-2" />}
            {t("seller.pay.cash")}
          </Button>

          {canPayCard ? (
            <Button
              variant="outline"
              className="w-full h-14 font-bold text-base"
              disabled={busy}
              onClick={() => void confirmCardPayment()}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {t("seller.pay.card")}
            </Button>
          ) : null}

          <Button variant="ghost" className="w-full" disabled={busy} onClick={finishWithoutCharge}>
            {t("tapToPay.seller.pay_later")}
          </Button>

          <Button
            variant="outline"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
            disabled={busy}
            onClick={() => void discardDraft()}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("seller.discard_order")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-secondary/20 pb-20">
      <div className="px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Vendedor</p>
          <p className="font-black">{sellerName || "Vendedor"}</p>
          <p className="text-[10px] text-muted-foreground mt-2">Total do pedido</p>
          <p className="text-3xl font-black tabular-nums text-primary">{totalPrice.toFixed(2)}€</p>
          <p className="text-[10px] text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setType("dine_in");
              if (!tableNumber.trim()) setMesaQrOpen(true);
            }}
            className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1 ${
              type === "dine_in" ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <Store className="h-5 w-5" />
            <span className="font-bold text-sm">Mesa</span>
          </button>
          <button
            type="button"
            onClick={() => setType("takeaway")}
            className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1 ${
              type === "takeaway" ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <Truck className="h-5 w-5" />
            <span className="font-bold text-sm">Balcão</span>
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div>
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <User className="h-3 w-3" /> Nome do cliente *
            </Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value.slice(0, 40))}
              placeholder="Nome"
              className="mt-1 h-11"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Phone className="h-3 w-3" /> Telefone (opcional)
            </Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+34 ..."
              inputMode="tel"
              className="mt-1 h-11"
            />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Email recibo (opcional)
            </Label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="mt-1 h-11"
            />
          </div>
          {type === "dine_in" && (
            <div className="space-y-2">
              {tableNumber.trim() ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mesa</p>
                    <p className="text-xl font-black tabular-nums">{tableNumber}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("seller.mesa.confirmed").replace("{n}", tableNumber)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 font-bold" onClick={() => setMesaQrOpen(true)}>
                    {t("seller.mesa.change")}
                  </Button>
                </div>
              ) : (
                <Button type="button" className="w-full h-12 font-bold" onClick={() => setMesaQrOpen(true)}>
                  <QrCode className="h-5 w-5 mr-2" />
                  {t("seller.mesa.scan_button")}
                </Button>
              )}
            </div>
          )}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: sem cebola"
              className="mt-1"
            />
          </div>
        </div>

        <Button
          onClick={() => void submit()}
          disabled={busy}
          className="w-full h-14 font-black text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <Send className="h-5 w-5 mr-2" /> Seguir para pagamento
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setScreen("review")}>
          Voltar ao carrinho
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/5"
          onClick={() => void discardDraft()}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("seller.discard_order")}
        </Button>
      </div>

      {storeId ? (
        <SellerMesaQrDialog
          open={mesaQrOpen}
          onOpenChange={setMesaQrOpen}
          storeId={storeId}
          onResolved={(result) => applyMesa(result.tableNumber)}
        />
      ) : null}
    </div>
  );
};

export default SellerCheckoutForm;
