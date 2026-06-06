import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, Store, Bell, Clock, Receipt, Volume2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ResetDataDialog from "@/components/ResetDataDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isPanelAlertsEnabled, setPanelAlertsEnabled } from "@/lib/panelAlerts";
import {
  isStaffPushEnabled,
  isStaffPushSupported,
  setStaffPushEnabled,
  subscribeStaffPush,
  unsubscribeStaffPush,
} from "@/lib/staffPush";
import MarketingBroadcastCard from "@/components/panel/MarketingBroadcastCard";
import OfficialSiteQrCard from "@/components/shared/OfficialSiteQrCard";
import WeeklyHoursEditor from "@/components/panel/WeeklyHoursEditor";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";
import { PremiumCard } from "@/components/premium/PremiumCard";

const PanelSettingsPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const { storeId: adminStoreId } = useAdminStoreId();
  const { t } = useStaffT();
  const effectiveStoreId = roleData?.store_id ?? adminStoreId ?? "";
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

  useEffect(() => {
    setSoundOnNewOrder(isPanelAlertsEnabled());
    setPushNotifications(isStaffPushEnabled());
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    if (!enabled) {
      setPushNotifications(false);
      setStaffPushEnabled(false);
      await unsubscribeStaffPush();
      toast.info("Push desactivado neste dispositivo");
      return;
    }
    if (!effectiveStoreId) {
      toast.error("Loja não identificada");
      return;
    }
    if (!isStaffPushSupported()) {
      toast.error("Push não disponível — configure VAPID e use HTTPS");
      return;
    }
    setPushBusy(true);
    try {
      const res = await subscribeStaffPush(effectiveStoreId);
      if (res.ok) {
        setPushNotifications(true);
        toast.success("Push activo — receberá avisos mesmo com o painel fechado");
      } else {
        setPushNotifications(false);
        toast.error(res.error || "Não foi possível activar push");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [closedToday, setClosedToday] = useState(false);

  const save = (section: string) => {
    toast.success(`${section} salvas (em memória)`);
  };

  return (
    <div className="space-y-5 max-w-6xl rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title={t("page.settings.title")}
        subtitle={t("page.settings.subtitle")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard title="Perfil da loja" value={storeName || "Loja"} subtitle="dados principais" icon={Store} color="brand" />
        <PremiumMetricCard title="Notificações" value={pushNotifications ? "Ativas" : "Desativadas"} subtitle="push e sons" icon={Bell} color={pushNotifications ? "green" : "red"} />
        <PremiumMetricCard title="Horários" value={closedToday ? "Fechado" : "Aberto"} subtitle={`${openTime} - ${closeTime}`} icon={Clock} color="blue" />
        <PremiumMetricCard title="Impressão" value={printAutoOnNew ? "Auto" : "Manual"} subtitle="novos pedidos" icon={Receipt} color="orange" />
      </section>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="store"><Store className="w-4 h-4 mr-1.5" /> {t("settings.tab.store")}</TabsTrigger>
          <TabsTrigger value="ops"><Clock className="w-4 h-4 mr-1.5" /> {t("settings.tab.ops")}</TabsTrigger>
          <TabsTrigger value="receipt"><Receipt className="w-4 h-4 mr-1.5" /> {t("settings.tab.receipt")}</TabsTrigger>
          <TabsTrigger value="notif"><Bell className="w-4 h-4 mr-1.5" /> {t("settings.tab.notif")}</TabsTrigger>
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
              <PremiumActionButton onClick={() => save("Loja")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</PremiumActionButton>

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
                    placeholder="Ex: A, B, MESA" maxLength={5} />
                </div>
              </div>
              <PremiumActionButton onClick={() => save("Operação")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</PremiumActionButton>

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
              <PremiumActionButton onClick={() => save("Recibo")}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</PremiumActionButton>

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
                { label: t("settings.notif.push"), desc: t("settings.notif.push.desc"), val: pushNotifications, set: (v: boolean) => { void handlePushToggle(v); }, icon: Bell, disabled: pushBusy },
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
              <PremiumActionButton onClick={() => save(t("settings.notif.title"))}><Save className="w-4 h-4 mr-2" /> {t("common.save")}</PremiumActionButton>
            </CardContent>
          </Card>
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

      <PremiumCard title="Zona perigosa" subtitle="Apague pedidos, caixa e outros dados deste projeto." className="border-destructive/40 bg-[#111111]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Zona perigosa
          </CardTitle>
          <CardDescription>
            Apague pedidos, caixa e outros dados deste projeto. Requer confirmação com sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PremiumActionButton
            className="from-[#B91C1C] to-[#D62300]"
            onClick={() => setResetOpen(true)}
            disabled={!roleData?.tenant_id}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Zerar dados do projeto
          </PremiumActionButton>
        </CardContent>
      </PremiumCard>

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