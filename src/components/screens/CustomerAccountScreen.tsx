import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import ScreenHeader from "@/components/ScreenHeader";
import PhoneInput from "@/components/PhoneInput";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";
import { loadLocalOrderHistory, type LocalOrderHistoryEntry } from "@/lib/customerOrderHistory";
import { loadSavedCustomerName } from "@/lib/customerSession";
import { Loader2, Package, RotateCcw, Gift } from "lucide-react";
import { toast } from "sonner";

type PastOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  order_type: string;
  created_at: string;
  items: Array<{ product_name: string; quantity: number; unit_price: number; extras?: unknown; removed?: string[]; notes?: string }>;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Recebido",
  preparing: "A preparar",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const CustomerAccountScreen = () => {
  const { setScreen, setTrackingOrderId, customerPhone, setCustomerPhone, phoneDialCode, setPhoneDialCode, setCustomerName } = useOrder();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const { storeId, selectedStoreId } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? storeId;
  const [localOrders, setLocalOrders] = useState<LocalOrderHistoryEntry[]>(() =>
    effectiveStoreId ? loadLocalOrderHistory(effectiveStoreId) : loadLocalOrderHistory(),
  );
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loyalty, setLoyalty] = useState<{ stamps: number; stamps_needed: number; reward_ready: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const fullPhone = formatFullPhone(phoneDialCode, customerPhone);
    if (!effectiveStoreId || !isValidCustomerPhone(phoneDialCode, customerPhone)) {
      toast.error("Introduce un teléfono válido");
      return;
    }
    setLoading(true);
    const [{ data: orderData }, { data: loyaltyData }] = await Promise.all([
      supabase.rpc("get_customer_orders", { _store_id: effectiveStoreId, _phone: fullPhone }),
      supabase.rpc("get_loyalty_status", { _store_id: effectiveStoreId, _phone: fullPhone }),
    ]);
    setOrders((orderData as PastOrder[]) || []);
    setLoyalty(loyaltyData as typeof loyalty);
    setSearched(true);
    setLoading(false);
  };

  useEffect(() => {
    const savedName = loadSavedCustomerName();
    if (savedName) setCustomerName(savedName);
    if (effectiveStoreId) {
      setLocalOrders(loadLocalOrderHistory(effectiveStoreId));
    }
    if (isValidCustomerPhone(phoneDialCode, customerPhone)) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStoreId]);

  const trackLocalOrder = (entry: LocalOrderHistoryEntry) => {
    setTrackingOrderId(entry.id);
    setScreen("tracking");
  };

  const reorder = (order: PastOrder) => {
    for (const item of order.items || []) {
      addItem({
        productId: `reorder-${Date.now()}-${Math.random()}`,
        productName: { es: item.product_name, en: item.product_name, pt: item.product_name, fr: item.product_name },
        productImage: "",
        basePrice: Number(item.unit_price),
        sizeName: null,
        sizeAdd: 0,
        extras: [],
        removedIngredients: item.removed || [],
        note: item.notes,
        unitPrice: Number(item.unit_price),
        quantity: item.quantity || 1,
        totalPrice: Number(item.unit_price) * (item.quantity || 1),
      });
    }
    toast.success("Produtos adicionados ao carrinho");
    setScreen("review");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScreenHeader eyebrow={t("trackMyOrders")} title={t("myOrdersTitle")} onBack={() => setScreen("home")} sticky />

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        <p className="text-sm text-muted-foreground">{t("phoneSearchHint")}</p>

        <div className="space-y-2">
          <PhoneInput
            dialCode={phoneDialCode}
            onDialCodeChange={setPhoneDialCode}
            localNumber={customerPhone}
            onLocalNumberChange={setCustomerPhone}
          />
          <button
            onClick={search}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            {t("searchMyOrders")}
          </button>
        </div>

        {localOrders.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pedidos neste dispositivo
            </p>
            {localOrders.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/70 bg-card/80 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">#{entry.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()} · {STATUS_LABEL[entry.status] || entry.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => trackLocalOrder(entry)}
                  className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary"
                >
                  {t("trackMyOrders")}
                </button>
              </div>
            ))}
          </div>
        )}

        {loyalty && searched && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-black">Fidelidade</p>
              <p className="text-sm text-muted-foreground">
                {loyalty.stamps} / {loyalty.stamps_needed} carimbos
                {loyalty.reward_ready && " · 🎁 Recompensa disponível!"}
              </p>
            </div>
          </div>
        )}

        {searched && orders.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado para este número</p>
        )}

        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-lg">#{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()} · {STATUS_LABEL[order.status] || order.status}
                </p>
              </div>
              <p className="font-black text-price tabular-nums">{Number(order.total).toFixed(2)}€</p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-0.5">
              {(order.items || []).slice(0, 3).map((it, i) => (
                <li key={i}>{it.quantity}x {it.product_name}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => { setTrackingOrderId(order.id); setScreen("tracking"); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-bold"
              >
                <Package className="w-4 h-4" /> {t("trackMyOrders")}
              </button>
              <button
                onClick={() => reorder(order)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/15 text-success text-sm font-bold"
              >
                <RotateCcw className="w-4 h-4" /> Pedir de novo
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerAccountScreen;
