import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, Store, Bell, Clock, Receipt, Volume2, Trash2, AlertTriangle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import ResetDataDialog from "@/components/ResetDataDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isPanelAlertsEnabled, setPanelAlertsEnabled } from "@/lib/panelAlerts";
import {
  isStaffPushEnabled,
  isStaffPushSupported,
  getStaffPushClientMode,
  setStaffPushEnabled,
  subscribeStaffPush,
  unsubscribeStaffPush,
} from "@/lib/staffPush";
import { useOptionalPanelStore } from "@/contexts/PanelStoreContext";
import MarketingBroadcastCard from "@/components/panel/MarketingBroadcastCard";
import OfficialSiteQrCard from "@/components/shared/OfficialSiteQrCard";
import WeeklyHoursEditor from "@/components/panel/WeeklyHoursEditor";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import TapToPaySettingsSection from "@/components/tapToPay/TapToPaySettingsSection";

const PanelSettingsPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const panelStore = useOptionalPanelStore();
  const { storeId: adminStoreId, loading: storeLoading } = useAdminStoreId();
  const { t, lang } = useStaffT();
  const effectiveStoreId = roleData?.store_id ?? panelStore?.storeId ?? adminStoreId ?? "";
  const [resetOpen, setResetOpen] = useState(false);
  const [storeName, setStoreName] = useState("Minha Loja");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storeCnpj, setStoreCnpj] = useState("");

  const [autoAcceptOrders, setAutoAcceptOrders] = useState(true);
  const [maxPrepMinutes, setMaxPrepMinutes] = useState(15);
  const [orderNumberPrefix, setOrderNumberPrefix] = useState("");
  const [allowOrderCancel, setAllowOrderCancel] = useState(false);

  const [printAutoOnNew, setPrintAutoOnNew] = useState(true);
  const [printCustomerCopy, setPrintCustomerCopy] = useState(true);
  const [receiptFooter, setReceiptFooter] = useState("¡Gracias por su compra!");
  const [taxRate, setTaxRate] = useState(0);

  const [soundOnNewOrder, setSoundOnNewOrder] = useState(() => isPanelAlertsEnabled());
  const [notifyKitchen, setNotifyKitchen] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(() => isStaffPushEnabled());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPending, setPushPending] = useState(false);
  const [pushLastError, setPushLastError] = useState<string | null>(null);
  const [pushClientMode, setPushClientMode] = useState<"native" | "web" | "needs-native-app" | "unsupported" | null>(
    null,
  );
  const [pushNativeHint, setPushNativeHint] = useState<string | null>(null);

  useEffect(() => {
    setSoundOnNewOrder(isPanelAlertsEnabled());
    setPushNotifications(isStaffPushEnabled());
    void getStaffPushClientMode().then(setPushClientMode);
    void import("@/services/nativePush").then(async ({ getNativePushRuntimeDiagnostics, isNativePushAvailable }) => {
      if (!(await isNativePushAvailable())) return;
      const diag = await getNativePushRuntimeDiagnostics();
      if (diag.permission === "denied") {
        setPushNativeHint("Notificações bloqueadas no iPhone — Definições → Kebab Turco → Notificações → Permitir.");
      } else if (diag.permission === "granted" && diag.hasCachedToken) {
        setPushNativeHint("Telemóvel pronto para alertas.");
      } else if (diag.permission === "granted") {
        setPushNativeHint("Permissão OK — ao ligar o interruptor, o telemóvel pode demorar até 1 minuto.");
      }
    });
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    setPushLastError(null);
    if (!enabled) {
      setPushPending(false);
      setPushNotifications(false);
      setStaffPushEnabled(false);
      await unsubscribeStaffPush();
      toast.info(t("settings.push.disabled"));
      return;
    }

    const mode = await getStaffPushClientMode();
    setPushClientMode(mode);

    if (mode === "needs-native-app") {
      const msg = t("settings.push.native_required");
      setPushLastError(msg);
      toast.error(msg);
      return;
    }

    if (storeLoading) {
      const msg = "A carregar a loja — espere um momento e tente outra vez.";
      setPushLastError(msg);
      toast.error(msg);
      return;
    }

    if (!effectiveStoreId) {
      setPushLastError(t("settings.push.no_store"));
      toast.error(t("settings.push.no_store"));
      return;
    }

    if (mode === "unsupported") {
      setPushLastError(t("settings.push.unavailable"));
      toast.error(t("settings.push.unavailable"));
      return;
    }

    setPushBusy(true);
    setPushPending(true);

    try {
      if (mode === "native") {
        const { initNativePushBridge, requestNativePushPermissionOnly, registerNativeStaffPush } =
          await import("@/services/nativePush");
        await initNativePushBridge();
        const perm = await requestNativePushPermissionOnly();
        if (!perm.granted) {
          setPushPending(false);
          setPushNotifications(false);
          const err =
            perm.receive === "denied"
              ? "Notificações bloqueadas — vá a Definições do iPhone → Kebab Turco → Notificações e permita."
              : "Permissão não concedida — tente outra vez.";
          setPushLastError(err);
          toast.error(err);
          return;
        }

        setPushNotifications(true);
        setStaffPushEnabled(true);
        toast.info("A registar este telemóvel — pode demorar até 1 minuto.");

        const res = await registerNativeStaffPush(effectiveStoreId, { skipPermissionRequest: true });
        if (res.ok) {
          setPushLastError(null);
          setPushNativeHint("Telemóvel registado para alertas.");
          toast.success(t("settings.push.enabled"));
        } else {
          const err = res.reason ?? t("settings.push.enable_error");
          setPushLastError(err);
          toast.error(err);
        }
        return;
      }

      if (!isStaffPushSupported()) {
        setPushPending(false);
        setPushNotifications(false);
        setPushLastError(t("settings.push.unavailable"));
        toast.error(t("settings.push.unavailable"));
        return;
      }

      const res = await subscribeStaffPush(effectiveStoreId);
      if (res.ok) {
        setPushNotifications(true);
        setPushLastError(null);
        toast.success(t("settings.push.enabled"));
      } else {
        setPushNotifications(false);
        const err = res.error || t("settings.push.enable_error");
        setPushLastError(err);
        toast.error(err);
      }
    } finally {
      setPushPending(false);
      setPushBusy(false);
    }
  };

  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [closedToday, setClosedToday] = useState(false);
  const [settingsTab, setSettingsTab] = useState("store");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    if (hash === "tap-to-pay" || hash === "tap") {
      setSettingsTab("tap");
    }
  }, []);

  const save = (sectionKey: "settings.tab.store" | "settings.tab.ops" | "settings.tab.receipt" | "settings.tab.notif") => {
    toast.success(panelT(lang, "settings.toast.saved_memory", { section: t(sectionKey) }));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PremiumPageHeader
        icon={SettingsIcon}
        title={t("page.settings.title")}
        subtitle={t("page.settings.subtitle")}
      />

      <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="store"><Store className="w-4 h-4 mr-1.5" /> {t("settings.tab.store")}</TabsTrigger>
          <TabsTrigger value="ops"><Clock className="w-4 h-4 mr-1.5" /> {t("settings.tab.ops")}</TabsTrigger>
          <TabsTrigger value="receipt"><Receipt className="w-4 h-4 mr-1.5" /> {t("settings.tab.receipt")}</TabsTrigger>
          <TabsTrigger value="notif"><Bell className="w-4 h-4 mr-1.5" /> {t("settings.tab.notif")}</TabsTrigger>
          <TabsTrigger value="tap"><Smartphone className="w-4 h-4 mr-1.5" /> {t("settings.tab.tap")}</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="w-4 h-4 mr-1.5" /> {t("settings.tab.hours")}</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.store.title")}</CardTitle>
              <CardDescription>{t("settings.store.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t("settings.store.name")}</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>{t("settings.store.phone")}</Label>
                  <Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="(11) 90000-0000" />
                </div>
                <div>
                  <Label>{t("settings.store.fiscal")}</Label>
                  <Input value={storeCnpj} onChange={(e) => setStoreCnpj(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t("settings.store.address")}</Label>
                <Textarea rows={2} value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
              </div>
              <Button onClick={() => save("settings.tab.store")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</Button>

            </CardContent>
          </Card>

          <OfficialSiteQrCard />
        </TabsContent>

        <TabsContent value="ops">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.ops.title")}</CardTitle>
              <CardDescription>{t("settings.ops.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">{t("settings.ops.autoaccept")}</Label>
                  <p className="text-xs text-muted-foreground">{t("settings.ops.autoaccept.desc")}</p>
                </div>
                <Switch checked={autoAcceptOrders} onCheckedChange={setAutoAcceptOrders} />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">{t("settings.ops.cancel")}</Label>
                  <p className="text-xs text-muted-foreground">{t("settings.ops.cancel.desc")}</p>
                </div>
                <Switch checked={allowOrderCancel} onCheckedChange={setAllowOrderCancel} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>{t("settings.ops.prepTime")}</Label>
                  <Input type="number" min={1} max={120} value={maxPrepMinutes}
                    onChange={(e) => setMaxPrepMinutes(Number(e.target.value))} />
                </div>
                <div>
                  <Label>{t("settings.ops.prefix")}</Label>
                  <Input value={orderNumberPrefix}
                    onChange={(e) => setOrderNumberPrefix(e.target.value)}
                    placeholder={t("settings.ops.prefix.ph")} maxLength={5} />
                </div>
              </div>
              <Button onClick={() => save("settings.tab.ops")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</Button>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.print.title")}</CardTitle>
              <CardDescription>{t("settings.print.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">{t("settings.print.auto")}</Label>
                  <p className="text-xs text-muted-foreground">{t("settings.print.auto.desc")}</p>
                </div>
                <Switch checked={printAutoOnNew} onCheckedChange={setPrintAutoOnNew} />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">{t("settings.print.customer")}</Label>
                  <p className="text-xs text-muted-foreground">{t("settings.print.customer.desc")}</p>
                </div>
                <Switch checked={printCustomerCopy} onCheckedChange={setPrintCustomerCopy} />
              </div>
              <div>
                <Label>{t("settings.print.footer")}</Label>
                <Textarea rows={2} value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
              </div>
              <div>
                <Label>{t("settings.print.tax")}</Label>
                <Input type="number" min={0} max={30} step={0.5} value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-1">{t("settings.print.tax.desc")}</p>
              </div>
              <Button onClick={() => save("settings.tab.receipt")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</Button>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notif">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notif.title")}</CardTitle>
              <CardDescription>{t("settings.notif.desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pushClientMode === null ? (
                <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  A verificar se está na app instalada ou no browser…
                </div>
              ) : null}
              {storeLoading ? (
                <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  A carregar a loja…
                </div>
              ) : null}
              {!storeLoading && !effectiveStoreId ? (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <p>Loja não identificada — saia e entre outra vez no painel, ou escolha a unidade no menu.</p>
                </div>
              ) : null}
              {pushClientMode === "needs-native-app" ? (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <p>{t("settings.push.native_required")}</p>
                </div>
              ) : null}
              {pushClientMode === "native" ? (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm flex gap-2">
                  <Smartphone className="h-5 w-5 shrink-0 text-emerald-700" />
                  <p>{t("settings.push.native_hint")}</p>
                </div>
              ) : null}
              {pushClientMode === "web" ? (
                <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {t("settings.push.web_hint")}
                </div>
              ) : null}
              {pushNativeHint && pushClientMode === "native" ? (
                <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {pushNativeHint}
                </div>
              ) : null}
              {pushLastError ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p>{pushLastError}</p>
                </div>
              ) : null}
              {[
                {
                  label: t("settings.notif.sound"),
                  desc: t("settings.notif.sound.desc"),
                  val: soundOnNewOrder,
                  set: (v: boolean) => {
                    setSoundOnNewOrder(v);
                    setPanelAlertsEnabled(v);
                  },
                  icon: Volume2,
                },
                { label: t("settings.notif.kitchen"), desc: t("settings.notif.kitchen.desc"), val: notifyKitchen, set: setNotifyKitchen, icon: Bell },
                { label: t("settings.notif.push"), desc: t("settings.notif.push.desc"), val: pushNotifications || pushPending, set: (v: boolean) => { void handlePushToggle(v); }, icon: Bell, disabled: pushBusy || storeLoading },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                  <div className="flex items-start gap-3">
                    <n.icon className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <Label className="text-base">{n.label}</Label>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                  </div>
                  <Switch checked={n.val} onCheckedChange={n.set} disabled={"disabled" in n ? n.disabled : false} />
                </div>
              ))}
              {roleData?.store_id && roleData?.tenant_id && (
                <MarketingBroadcastCard
                  storeId={roleData.store_id}
                  tenantId={roleData.tenant_id}
                />
              )}
              <Button onClick={() => save("settings.tab.notif")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tap">
          {effectiveStoreId ? (
            <div id="tap-to-pay">
              <TapToPaySettingsSection storeId={effectiveStoreId} />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">{t("settings.hours.loading")}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.hours.title")}</CardTitle>
              <CardDescription>
                {t("settings.hours.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {effectiveStoreId ? (
                <WeeklyHoursEditor storeId={effectiveStoreId} />
              ) : (
                <p className="text-sm text-muted-foreground">{t("settings.hours.loading")}</p>
              )}

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> {t("settings.danger.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.danger.desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setResetOpen(true)}
            disabled={!roleData?.tenant_id}
          >
            <Trash2 className="w-4 h-4 mr-2" /> {t("settings.danger.reset")}
          </Button>
        </CardContent>
      </Card>

      {roleData?.tenant_id && (
        <ResetDataDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          tenantId={roleData.tenant_id}
          restrictDestructive
        />
      )}
    </div>
  );
};

export default PanelSettingsPage;