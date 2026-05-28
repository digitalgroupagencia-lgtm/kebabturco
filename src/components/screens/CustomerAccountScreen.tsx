import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import ScreenHeader from "@/components/ScreenHeader";
import PhoneInput from "@/components/PhoneInput";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";
import { loadLocalOrderHistory, type LocalOrderHistoryEntry } from "@/lib/customerOrderHistory";
import {
  loadCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/lib/customerSession";
import { Loader2, Package, RotateCcw, Gift, User, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { TAB_BAR_VISIBLE_SCREENS } from "@/lib/customerBottomBars";

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
  const {
    screen,
    setScreen,
    accountFocus,
    setTrackingOrderId,
    customerPhone,
    setCustomerPhone,
    phoneDialCode,
    setPhoneDialCode,
    setCustomerName,
    setDeliveryAddress,
    setDeliveryNumber,
    setDeliveryComplement,
    setDeliveryPostalCode,
    setDeliveryCity,
    setDeliveryNotes,
  } = useOrder();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const { storeId, selectedStoreId } = useResolvedStore();
  const effectiveStoreId = selectedStoreId ?? storeId;

  const [profile, setProfile] = useState<CustomerProfile>(() => loadCustomerProfile());
  const [localOrders, setLocalOrders] = useState<LocalOrderHistoryEntry[]>(() =>
    effectiveStoreId ? loadLocalOrderHistory(effectiveStoreId) : loadLocalOrderHistory(),
  );
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loyalty, setLoyalty] = useState<{ stamps: number; stamps_needed: number; reward_ready: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const profileSectionRef = useRef<HTMLElement>(null);
  const ordersSectionRef = useRef<HTMLElement>(null);
  const tabBarVisible = TAB_BAR_VISIBLE_SCREENS.has(screen);

  useEffect(() => {
    if (screen !== "account") return;
    const target = accountFocus === "orders" ? ordersSectionRef.current : profileSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [screen, accountFocus]);

  const syncProfileToOrder = (next: CustomerProfile) => {
    setCustomerName(next.name);
    setPhoneDialCode(next.phoneDialCode);
    setCustomerPhone(next.phoneLocal);
    setDeliveryAddress(next.delivery.street);
    setDeliveryNumber(next.delivery.number);
    setDeliveryComplement(next.delivery.complement);
    setDeliveryPostalCode(next.delivery.postalCode);
    setDeliveryCity(next.delivery.city);
    setDeliveryNotes(next.delivery.notes);
  };

  const saveProfile = () => {
    setSavingProfile(true);
    try {
      saveCustomerProfile(profile);
      syncProfileToOrder(profile);
      toast.success(t("profileSaved"));
    } finally {
      setSavingProfile(false);
    }
  };

  const updateProfile = (patch: Partial<CustomerProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...patch,
      delivery: patch.delivery ? { ...prev.delivery, ...patch.delivery } : prev.delivery,
    }));
  };

  const search = async (phoneOverride?: { dialCode: string; local: string }) => {
    const dial = phoneOverride?.dialCode ?? phoneDialCode;
    const local = phoneOverride?.local ?? customerPhone;
    const fullPhone = formatFullPhone(dial, local);
    if (!effectiveStoreId || !isValidCustomerPhone(dial, local)) {
      toast.error(t("enterPhone"));
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
    const saved = loadCustomerProfile();
    setProfile(saved);
    syncProfileToOrder(saved);
    if (effectiveStoreId) {
      setLocalOrders(loadLocalOrderHistory(effectiveStoreId));
    }
    if (isValidCustomerPhone(saved.phoneDialCode, saved.phoneLocal)) {
      void search({ dialCode: saved.phoneDialCode, local: saved.phoneLocal });
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

  const handlePhoneChange = (local: string) => {
    setCustomerPhone(local);
    updateProfile({ phoneLocal: local, phoneDialCode: phoneDialCode });
  };

  const handleDialChange = (dial: string) => {
    setPhoneDialCode(dial);
    updateProfile({ phoneDialCode: dial, phoneLocal: customerPhone });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <ScreenHeader
        eyebrow={accountFocus === "profile" ? t("navAccount") : t("openMyOrders")}
        title={accountFocus === "profile" ? t("myAccountTitle") : t("myOrdersTitle")}
        onBack={tabBarVisible ? undefined : () => setScreen("home")}
        sticky
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        <section ref={profileSectionRef} className="rounded-2xl border border-border bg-card p-4 space-y-3 scroll-mt-4">
          <div className="flex items-start gap-2">
            <User className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-black">{t("myProfileSection")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("myProfileHint")}</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("yourName")}</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value.slice(0, 40) })}
              className="mt-1 w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 border-transparent focus:border-primary"
              placeholder={t("enterName")}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("yourPhone")}</label>
            <div className="mt-1">
              <PhoneInput
                dialCode={profile.phoneDialCode}
                onDialCodeChange={handleDialChange}
                localNumber={profile.phoneLocal}
                onLocalNumberChange={handlePhoneChange}
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("deliveryAddressSection")}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={profile.delivery.street}
                onChange={(e) => updateProfile({ delivery: { ...profile.delivery, street: e.target.value.slice(0, 80) } })}
                placeholder={t("addressStreetPh")}
                className="col-span-2 h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
              />
              <input
                type="text"
                value={profile.delivery.number}
                onChange={(e) => updateProfile({ delivery: { ...profile.delivery, number: e.target.value.slice(0, 12) } })}
                placeholder={t("addressNumber")}
                className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="text"
                value={profile.delivery.postalCode}
                onChange={(e) => updateProfile({ delivery: { ...profile.delivery, postalCode: e.target.value.slice(0, 12) } })}
                placeholder={t("addressPostal")}
                className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
              />
              <input
                type="text"
                value={profile.delivery.city}
                onChange={(e) => updateProfile({ delivery: { ...profile.delivery, city: e.target.value.slice(0, 40) } })}
                placeholder={t("addressCity")}
                className="h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
              />
            </div>
            <input
              type="text"
              value={profile.delivery.complement}
              onChange={(e) => updateProfile({ delivery: { ...profile.delivery, complement: e.target.value.slice(0, 60) } })}
              placeholder={t("addressFloorPh")}
              className="mt-2 w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
            />
          </div>

          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="w-full h-11 rounded-2xl border border-primary/30 bg-primary/10 text-primary font-black flex items-center justify-center gap-2"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("saveMyData")}
          </button>
        </section>

        <section ref={ordersSectionRef} className="space-y-3 scroll-mt-4">
          <p className="text-sm font-bold">{t("searchMyOrders")}</p>
          <p className="text-xs text-muted-foreground -mt-2">{t("phoneSearchHint")}</p>

          <button
            onClick={() => void search()}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-gradient-primary text-primary-foreground font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-primary"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            {t("searchMyOrders")}
          </button>
        </section>

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
          <p className="text-center text-muted-foreground py-4">Nenhum pedido encontrado para este número</p>
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

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-6"
        style={{ background: "linear-gradient(to top, hsl(var(--background)) 40%, transparent)" }}
      >
        <a
          href="/staff-login"
          className="pointer-events-auto text-[9px] font-medium text-foreground/18 hover:text-foreground/35 transition-colors tracking-[0.2em] uppercase select-none"
        >
          Equipe
        </a>
      </div>
    </div>
  );
};

export default CustomerAccountScreen;
