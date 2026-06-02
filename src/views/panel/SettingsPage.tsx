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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" /> {t("page.settings.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("page.settings.subtitle")}
        </p>
      </div>

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
              <CardTitle>Dados da loja</CardTitle>
              <CardDescription>Informações exibidas em recibos e impressões.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome da loja</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="(11) 90000-0000" />
                </div>
                <div>
                  <Label>CNPJ / Identificação fiscal</Label>
                  <Input value={storeCnpj} onChange={(e) => setStoreCnpj(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Endereço completo</Label>
                <Textarea rows={2} value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
              </div>
              <Button onClick={() => save("Loja")}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </CardContent>
          </Card>

          <OfficialSiteQrCard />
        </TabsContent>

        <TabsContent value="ops">
          <Card>
            <CardHeader>
              <CardTitle>Operação</CardTitle>
              <CardDescription>Como pedidos são processados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Aceitar pedidos automaticamente</Label>
                  <p className="text-xs text-muted-foreground">Se desativado, cada pedido precisa ser confirmado pela equipe.</p>
                </div>
                <Switch checked={autoAcceptOrders} onCheckedChange={setAutoAcceptOrders} />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Permitir cancelamento de pedidos</Label>
                  <p className="text-xs text-muted-foreground">Operadores podem cancelar pedidos em andamento.</p>
                </div>
                <Switch checked={allowOrderCancel} onCheckedChange={setAllowOrderCancel} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Tempo máx. de preparo (min)</Label>
                  <Input type="number" min={1} max={120} value={maxPrepMinutes}
                    onChange={(e) => setMaxPrepMinutes(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Prefixo do número do pedido</Label>
                  <Input value={orderNumberPrefix}
                    onChange={(e) => setOrderNumberPrefix(e.target.value)}
                    placeholder="Ex: A, B, MESA" maxLength={5} />
                </div>
              </div>
              <Button onClick={() => save("Operação")}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle>Recibo / impressão</CardTitle>
              <CardDescription>Personalize o que sai na impressora.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Imprimir automaticamente novos pedidos</Label>
                  <p className="text-xs text-muted-foreground">Manda direto pra cozinha quando entra pedido novo.</p>
                </div>
                <Switch checked={printAutoOnNew} onCheckedChange={setPrintAutoOnNew} />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
                <div>
                  <Label className="text-base">Imprimir via do cliente</Label>
                  <p className="text-xs text-muted-foreground">Gera segunda via para entregar ao cliente.</p>
                </div>
                <Switch checked={printCustomerCopy} onCheckedChange={setPrintCustomerCopy} />
              </div>
              <div>
                <Label>Mensagem no rodapé do recibo</Label>
                <Textarea rows={2} value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
              </div>
              <div>
                <Label>Taxa de serviço (%)</Label>
                <Input type="number" min={0} max={30} step={0.5} value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-1">Adiciona automaticamente ao total. 0 = desativado.</p>
              </div>
              <Button onClick={() => save("Recibo")}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notif">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Como a equipe é avisada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Som ao receber novo pedido",
                  desc: "Ligado ao mesmo sistema de «Activar alertas» em Pedidos ao vivo.",
                  val: soundOnNewOrder,
                  set: (v: boolean) => {
                    setSoundOnNewOrder(v);
                    setPanelAlertsEnabled(v);
                  },
                  icon: Volume2,
                },
                { label: "Avisar a cozinha", desc: "Marca o pedido como 'novo' na tela da cozinha.", val: notifyKitchen, set: setNotifyKitchen, icon: Bell },
                { label: "Notificações push (mobile)", desc: "Aviso no telemóvel mesmo com app fechada (requer permissão).", val: pushNotifications, set: (v: boolean) => { void handlePushToggle(v); }, icon: Bell, disabled: pushBusy },
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
              <Button onClick={() => save("Notificações")}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Horário de funcionamento</CardTitle>
              <CardDescription>
                Defina os horários reais por dia da semana, para a loja e para o delivery separadamente.
                Quando o canal está fechado, o cliente continua a poder navegar e montar carrinho — só não consegue finalizar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {effectiveStoreId ? (
                <WeeklyHoursEditor storeId={effectiveStoreId} />
              ) : (
                <p className="text-sm text-muted-foreground">A carregar loja…</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Zona perigosa
          </CardTitle>
          <CardDescription>
            Apague pedidos, caixa e outros dados deste projeto. Requer confirmação com sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setResetOpen(true)}
            disabled={!roleData?.tenant_id}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Zerar dados do projeto
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