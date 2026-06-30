import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/contexts/OrderContext";
import { useCart } from "@/customer/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import ScreenHeader from "@/components/ScreenHeader";
import PhoneInput from "@/components/PhoneInput";
import { formatFullPhone, isValidCustomerPhone } from "@/lib/phoneNumber";
import { loadLocalOrderHistory, type LocalOrderHistoryEntry } from "@/lib/customerOrderHistory";
import {
  loadCustomerProfile,
  saveCustomerProfile,
  hasCustomerProfile,
  type CustomerProfile,
} from "@/lib/customerSession";
import { Loader2, Package, RotateCcw, Gift, User, MapPin, Save, ChevronRight, Bell } from "lucide-react";
import { appToastSuccess, appToastError } from "@/lib/appToast";
import { TAB_BAR_VISIBLE_SCREENS } from "@/lib/customerBottomBars";
import {
  fetchCustomerProfileFromCloud,
  isProfileMostlyEmpty,
  mergeCustomerProfiles,
  saveCustomerProfileToCloud,
} from "@/lib/customerProfileCloud";
import {
  isCustomerMarketingPushOpted,
  isCustomerMarketingPushSupported,
  subscribeCustomerMarketingPush,
} from "@/lib/customerMarketingPush";

type PastOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  order_type: string;
  created_at: string;
  items: Array<{
    product_id?: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price?: number;
    size_name?: string | null;
    extras?: unknown;
    removed?: string[];
    notes?: string;
    selections?: unknown;
    configuration?: unknown;
  }>;
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
    hydrateCustomerProfile,
  } = useOrder();
  const { addItem } = useCart();
  const { t } = useLanguage();

  const orderStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("orderStatusPending"),
      preparing: t("orderStatusPreparing"),
      ready: t("orderStatusReady"),
      delivered: t("orderStatusDelivered"),
      cancelled: t("orderStatusCancelled"),
    };
    return map[status] || status;
  };
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
  const [activatingPush, setActivatingPush] = useState(false);
  const [pushOpted, setPushOpted] = useState(() => isCustomerMarketingPushOpted());
  const [profileExpanded, setProfileExpanded] = useState(() => !hasCustomerProfile());
  const profileSectionRef = useRef<HTMLElement>(null);
  const ordersSectionRef = useRef<HTMLElement>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const tabBarVisible = TAB_BAR_VISIBLE_SCREENS.has(screen);
  const pushSupported = isCustomerMarketingPushSupported();

  useEffect(() => {
    if (screen !== "account") return;
    const target = accountFocus === "orders" ? ordersSectionRef.current : profileSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [screen, accountFocus]);

  const reloadProfileFromDevice = () => {
    const saved = loadCustomerProfile();
    setProfile(saved);
    hydrateCustomerProfile(saved);
    return saved;
  };

  const saveProfile = () => {
    setSavingProfile(true);
    try {
      saveCustomerProfile(profile);
      hydrateCustomerProfile(profile);
      if (effectiveStoreId) {
        void saveCustomerProfileToCloud(effectiveStoreId, profile);
      }
      setProfileExpanded(false);
      appToastSuccess(t("profileSaved"));
    } finally {
      setSavingProfile(false);
    }
  };

  const profileSummaryLine = () => {
    const d = profile.delivery;
    const street = [d.street, d.number].filter(Boolean).join(" ");
    const city = [d.postalCode, d.city].filter(Boolean).join(" ");
    return [street, city].filter(Boolean).join(" · ");
  };

  const displayPhone = isValidCustomerPhone(profile.phoneDialCode, profile.phoneLocal)
    ? formatFullPhone(profile.phoneDialCode, profile.phoneLocal)
    : "";

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
      appToastError(t("enterPhone"));
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
    if (screen !== "account") return;
    const saved = reloadProfileFromDevice();
    if (effectiveStoreId) {
      setLocalOrders(loadLocalOrderHistory(effectiveStoreId));
    }
    if (isValidCustomerPhone(saved.phoneDialCode, saved.phoneLocal)) {
      void search({ dialCode: saved.phoneDialCode, local: saved.phoneLocal });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, effectiveStoreId]);

  useEffect(() => {
    if (screen !== "account" || !effectiveStoreId) return;
    if (!isValidCustomerPhone(profile.phoneDialCode, profile.phoneLocal)) return;
    if (!isProfileMostlyEmpty(profileRef.current)) return;
    let cancelled = false;
    void fetchCustomerProfileFromCloud(
      effectiveStoreId,
      profile.phoneDialCode,
      profile.phoneLocal,
    ).then((remote) => {
      if (cancelled || !remote) return;
      const merged = mergeCustomerProfiles(profileRef.current, remote);
      setProfile(merged);
      saveCustomerProfile(merged);
      hydrateCustomerProfile(merged);
      setProfileExpanded(false);
    });
    return () => {
      cancelled = true;
    };
  }, [screen, effectiveStoreId, profile.phoneDialCode, profile.phoneLocal, hydrateCustomerProfile]);

  useEffect(() => {
    if (screen !== "account") return;
    const timer = window.setTimeout(() => {
      const current = profileRef.current;
      saveCustomerProfile(current);
      if (effectiveStoreId && isValidCustomerPhone(current.phoneDialCode, current.phoneLocal)) {
        void saveCustomerProfileToCloud(effectiveStoreId, current);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [profile, screen, effectiveStoreId]);

  useEffect(() => {
    return () => {
      const current = profileRef.current;
      saveCustomerProfile(current);
      if (effectiveStoreId && isValidCustomerPhone(current.phoneDialCode, current.phoneLocal)) {
        void saveCustomerProfileToCloud(effectiveStoreId, current);
      }
    };
  }, [effectiveStoreId]);

  const trackLocalOrder = (entry: LocalOrderHistoryEntry) => {
    setTrackingOrderId(entry.id);
    setScreen("tracking");
  };

  const reorder = async (order: PastOrder) => {
    const items = order.items || [];
    if (items.length === 0) {
      appToastError(t("emptyOrderError"));
      return;
    }

    // Recolhe todos os product_id reais (quando existem) para buscar imagem/nome/preço actuais.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const productIds = Array.from(
      new Set(
        items
          .map((i) => i.product_id)
          .filter((id): id is string => !!id && uuidRe.test(id)),
      ),
    );
    const productNames = Array.from(
      new Set(items.map((i) => i.product_name).filter((n): n is string => !!n)),
    );

    type ProductRow = {
      id: string;
      name: unknown;
      image_url: string | null;
      price: number;
      product_type: string | null;
    };
    let productsById = new Map<string, ProductRow>();
    const productsByName = new Map<string, ProductRow>();
    if (productIds.length > 0 || productNames.length > 0) {
      const queries: Array<PromiseLike<{ data: ProductRow[] | null; error: unknown }>> = [];
      if (productIds.length > 0) {
        queries.push(
          supabase.from("products").select("id, name, image_url, price, product_type").in("id", productIds) as unknown as PromiseLike<{ data: ProductRow[] | null; error: unknown }>,
        );
      }
      // Fallback by name (covers items saved without product_id, e.g. combos/refrescos).
      if (productNames.length > 0 && effectiveStoreId) {
        queries.push(
          supabase
            .from("products")
            .select("id, name, image_url, price, product_type")
            .eq("store_id", effectiveStoreId)
            .in("name", productNames as string[]) as unknown as PromiseLike<{ data: ProductRow[] | null; error: unknown }>,
        );
      }
      const results = await Promise.all(queries);
      for (const r of results) {
        if (r.error) {
          // Não bloqueia a recompra, apenas regista e segue com fallback por nome/dados do pedido.
          console.warn("[reorder] product lookup failed", r.error);
          continue;
        }
        for (const p of r.data ?? []) {
          productsById.set(p.id, p);
          const nm =
            typeof p.name === "string"
              ? p.name
              : p.name && typeof p.name === "object"
              ? Object.values(p.name as Record<string, string>).find(Boolean) || ""
              : "";
          if (nm) productsByName.set(nm, p);
        }
      }
    }


    let addedCount = 0;
    let missingCount = 0;

    for (const item of items) {
      let prod = item.product_id ? productsById.get(item.product_id) : undefined;
      // Fallback: lookup by product name when no id or product was removed.
      if (!prod && item.product_name) prod = productsByName.get(item.product_name);
      if (item.product_id && !prod && !productsByName.get(item.product_name || "")) {
        // Produto removido do menu, pula para não meter imagem vazia.
        missingCount += 1;
        continue;
      }


      const productNameI18n =
        prod && prod.name && typeof prod.name === "object"
          ? (prod.name as Record<string, string>)
          : { es: item.product_name, en: item.product_name, pt: item.product_name, fr: item.product_name };

      const sizeName = item.size_name
        ? { es: item.size_name, en: item.size_name, pt: item.size_name, fr: item.size_name }
        : null;

      const extrasArr = Array.isArray(item.extras) ? (item.extras as Array<Record<string, unknown>>) : [];
      const cartExtras = extrasArr
        .filter((e) => e && typeof e === "object")
        .map((e, idx) => {
          const rawName = (e.name ?? e.product_name ?? "") as unknown;
          const name =
            rawName && typeof rawName === "object"
              ? (rawName as Record<string, string>)
              : { es: String(rawName), en: String(rawName), pt: String(rawName), fr: String(rawName) };
          return {
            id: String(e.id ?? `extra-${idx}`),
            name,
            price: Number(e.price ?? 0),
            quantity: Number(e.quantity ?? 1),
          };
        });

      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = Number(item.unit_price) || 0;
      const total = item.total_price != null ? Number(item.total_price) : unit * qty;

      addItem({
        productId: prod?.id || `reorder-${Date.now()}-${Math.random()}`,
        productName: productNameI18n,
        productImage: prod?.image_url || null,
        basePrice: prod?.price != null ? Number(prod.price) : unit,
        sizeName,
        sizeAdd: 0,
        extras: cartExtras,
        removedIngredients: Array.isArray(item.removed) ? (item.removed as string[]) : [],
        note: item.notes,
        unitPrice: unit,
        quantity: qty,
        totalPrice: total,
        selections: Array.isArray(item.selections) ? (item.selections as never) : undefined,
        configuration:
          item.configuration && typeof item.configuration === "object"
            ? (item.configuration as never)
            : undefined,
        productType:
          (prod?.product_type as never) ??
          ((item.configuration && (item.configuration as { comboUnits?: unknown[] }).comboUnits?.length) ||
          (Array.isArray(item.selections) && (item.selections as { unitIndex?: number | null }[]).some((s) => s?.unitIndex != null))
            ? ("combo" as never)
            : undefined),
      });
      addedCount += 1;
    }

    if (addedCount === 0) {
      appToastError(t("reorderProductsUnavailable"));
      return;
    }
    if (missingCount > 0) {
      appToastSuccess(`${addedCount} producto(s) añadido(s). ${missingCount} ya no disponible(s).`);
    } else {
      appToastSuccess(t("reorderProductsAdded"));
    }
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

  const handleActivatePush = async () => {
    if (!effectiveStoreId || !pushSupported) return;
    setActivatingPush(true);
    try {
      const result = await subscribeCustomerMarketingPush(effectiveStoreId);
      if (result.ok) {
        setPushOpted(true);
        appToastSuccess(t("pushActivated"));
      } else {
        appToastError(result.error || t("pushActivateFailed"));
      }
    } finally {
      setActivatingPush(false);
    }
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
        <section ref={profileSectionRef} className="rounded-2xl border border-border bg-card scroll-mt-4 overflow-hidden">
          {!profileExpanded ? (
            <button
              type="button"
              onClick={() => setProfileExpanded(true)}
              className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/40 transition-colors"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black truncate">
                  {profile.name.trim() || t("myProfileSection")}
                </p>
                {displayPhone ? (
                  <p className="text-xs text-muted-foreground truncate">{displayPhone}</p>
                ) : null}
                {profileSummaryLine() ? (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{profileSummaryLine()}</p>
                ) : null}
                <p className="text-[10px] font-bold text-primary mt-1">{t("editMyData")}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          ) : (
            <div className="p-4 space-y-3">
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
            <p className="text-[10px] text-muted-foreground mt-2 mb-1">{t("addressFloorDoorHint")}</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                  {t("addressFloor")}
                </label>
                <input
                  type="text"
                  value={profile.delivery.floor}
                  onChange={(e) => updateProfile({ delivery: { ...profile.delivery, floor: e.target.value.slice(0, 20) } })}
                  placeholder={t("addressFloorPh")}
                  className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                  {t("addressDoor")}
                </label>
                <input
                  type="text"
                  value={profile.delivery.door}
                  onChange={(e) => updateProfile({ delivery: { ...profile.delivery, door: e.target.value.slice(0, 20) } })}
                  placeholder={t("addressDoorPh")}
                  className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                  {t("addressBlock")}
                </label>
                <input
                  type="text"
                  value={profile.delivery.block}
                  onChange={(e) => updateProfile({ delivery: { ...profile.delivery, block: e.target.value.slice(0, 20) } })}
                  placeholder={t("addressBlockPh")}
                  className="w-full h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl"
                />
              </div>
            </div>
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
            </div>
          )}
        </section>

        {pushSupported && !pushOpted && (
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm">{t("pushOptInTitle")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("pushOptInHint")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleActivatePush()}
              disabled={activatingPush}
              className="w-full h-11 rounded-2xl bg-gradient-primary text-primary-foreground font-black flex items-center justify-center gap-2 shadow-primary disabled:opacity-60"
            >
              {activatingPush ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {t("pushOptInButton")}
            </button>
          </section>
        )}

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
              {t("localDeviceOrdersTitle")}
            </p>
            {localOrders.slice(0, 5).map((entry) => {
              const ageHours = (Date.now() - new Date(entry.createdAt).getTime()) / 36e5;
              const isActive =
                entry.status !== "delivered" && entry.status !== "cancelled" && ageHours < 6;

              return (
              <div key={entry.id} className="rounded-2xl border border-border/70 bg-card/80 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">#{entry.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()} · {orderStatusLabel(entry.status)}
                  </p>
                </div>
                {isActive && (
                <button
                  type="button"
                  onClick={() => trackLocalOrder(entry)}
                  className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-xs font-black text-primary"
                >
                  {t("trackMyOrders")}
                </button>
                )}
              </div>
              );
            })}

          </div>
        )}

        {loyalty && searched && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="font-black">{t("loyaltyTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("loyaltyStamps")
                  .replace("{current}", String(loyalty.stamps))
                  .replace("{needed}", String(loyalty.stamps_needed))}
                {loyalty.reward_ready ? `🎁${t("loyaltyRewardReady")}` : ""}
              </p>
            </div>
          </div>
        )}

        {searched && orders.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-4">{t("noOrdersForPhone")}</p>
        )}

        {orders.map((order) => {
          const ageHours = (Date.now() - new Date(order.created_at).getTime()) / 36e5;
          const isActiveOrder =
            order.status !== "delivered" &&
            order.status !== "cancelled" &&
            ageHours < 6;
          return (

          <div key={order.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-lg">#{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()} · {orderStatusLabel(order.status)}
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
              {isActiveOrder && (
                <button
                  onClick={() => { setTrackingOrderId(order.id); setScreen("tracking"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-bold"
                >
                  <Package className="w-4 h-4" /> {t("trackMyOrders")}
                </button>
              )}
              <button
                onClick={() => void reorder(order)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-success/15 text-success text-sm font-bold"
              >
                <RotateCcw className="w-4 h-4" /> {t("reorderFromHistory")}
              </button>
            </div>
          </div>
          );
        })}

      </div>
    </div>
  );
};

export default CustomerAccountScreen;
