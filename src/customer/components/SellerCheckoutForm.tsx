import { useState } from "react";
import { Loader2, Send, User, Phone, Hash, Truck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/customer/contexts/CartContext";
import { useOrder } from "@/contexts/OrderContext";
import { useSellerMode } from "@/contexts/SellerModeContext";
import { supabase } from "@/integrations/supabase/client";
import { nav } from "@/lib/navPaths";

type OrderTypeChoice = "dine_in" | "takeaway";

const SellerCheckoutForm = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { storeId, setScreen } = useOrder();
  const { sellerId, sellerName } = useSellerMode();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [type, setType] = useState<OrderTypeChoice>("dine_in");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!customerName.trim()) return toast.error("Informe o nome do cliente");
    if (type === "dine_in" && !tableNumber.trim()) return toast.error("Informe a mesa");
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!storeId) return toast.error("Loja não identificada");

    setBusy(true);
    try {
      const orderNumber = String(Math.floor(100 + Math.random() * 900));
      const { data: orderRow, error } = await supabase
        .from("orders")
        .insert({
          store_id: storeId,
          order_number: orderNumber,
          order_type: type,
          status: "pending",
          payment_status: "pending",
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          table_number: type === "dine_in" ? tableNumber.trim() : null,
          notes: notes.trim() || null,
          subtotal: totalPrice,
          total: totalPrice,
          seller_id: sellerId,
          source: "seller" as any,
        })
        .select("id, order_number")
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

      toast.success(`Pedido #${orderRow.order_number} registado`);
      clearCart();
      setScreen("home");
      navigate(nav.seller());
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Falha ao registar pedido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-secondary/20 overflow-y-auto">
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
            onClick={() => setType("dine_in")}
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
          {type === "dine_in" && (
            <div>
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Hash className="h-3 w-3" /> Mesa *
              </Label>
              <Input
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="1"
                className="mt-1 h-11"
              />
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
          className="w-full h-14 font-black text-base bg-cta hover:bg-cta/90 text-white"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              <Send className="h-5 w-5 mr-2" /> Registar pedido
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => setScreen("review")}>
          Voltar ao carrinho
        </Button>
      </div>
    </div>
  );
};

export default SellerCheckoutForm;
