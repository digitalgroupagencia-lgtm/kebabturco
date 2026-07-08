import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Eye,
  FlaskConical,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import AdminStoreSwitcher from "@/components/admin/AdminStoreSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import {
  CUSTOMER_STATUS_OPTIONS,
  getPushLabScenario,
  PUSH_LAB_SCENARIOS,
  type CustomerStatusEvent,
  type PushLabScenarioId,
} from "@/lib/push/pushTestLabScenarios";
import {
  createPushLabTestOrder,
  fetchPushLabBanners,
  fetchPushLabOrders,
  fetchStaffPushToStartTokenCount,
  sendPushLabScenario,
  type PushLabBannerRow,
  type PushLabOrderRow,
  type PushTestSendResult,
} from "@/lib/push/pushTestService";

function formatOrderLabel(o: PushLabOrderRow): string {
  const num = String(o.order_number).padStart(4, "0");
  const type = o.order_type ? ` · ${o.order_type}` : "";
  return `#${num} · ${o.status}${type}`;
}

function PushPreviewCard({
  title,
  body,
  imageUrl,
  liveActivity,
  liveKind,
}: {
  title: string;
  body: string;
  imageUrl?: string;
  liveActivity?: boolean;
  liveKind?: "staff" | "customer";
}) {
  const displayTitle = title || (liveKind === "staff" ? "Novo pedido" : liveKind === "customer" ? "O teu pedido" : "Kebab Turco");
  const displayBody = body || (liveKind === "staff" ? "Toca ACEITAR para começar a preparar." : "Acompanha o estado em tempo real.");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-muted/40 p-3 shadow-inner">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Faixa pequena</p>
        <div className="rounded-xl bg-background border px-3 py-2.5 flex gap-3 items-start shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <Bell className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{displayTitle}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{displayBody}</p>
          </div>
        </div>
      </div>

      {liveActivity ? (
        <div className="rounded-2xl border bg-zinc-900 p-3 text-white shadow-lg">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-2 flex items-center gap-1">
            <Smartphone className="h-3 w-3" /> Cartão no ecrã bloqueado
          </p>
          <div className="rounded-2xl bg-gradient-to-br from-[#3A0205] to-[#5c0a0f] p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-lg font-bold">{liveKind === "staff" ? "Novo pedido" : "O teu pedido"}</p>
                <p className="text-sm text-white/80">{displayBody}</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {liveKind === "staff" ? "Pendente" : "A seguir"}
              </Badge>
            </div>
            {liveKind === "staff" ? (
              <button type="button" className="w-full rounded-xl bg-white text-[#3A0205] font-bold py-3 text-sm">
                ACEITAR
              </button>
            ) : (
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-2/3 bg-white rounded-full" />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {imageUrl ? (
        <div className="rounded-xl overflow-hidden border">
          <img src={imageUrl} alt="Pré-visualização" className="w-full max-h-40 object-cover" />
        </div>
      ) : null}
    </div>
  );
}

export default function PushTestLabPanel() {
  const { storeId } = useAdminStoreId();
  const [scenarioId, setScenarioId] = useState<PushLabScenarioId>("staff_new_order");
  const scenario = useMemo(() => getPushLabScenario(scenarioId), [scenarioId]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customerEvent, setCustomerEvent] = useState<CustomerStatusEvent>("preparing");
  const [orders, setOrders] = useState<PushLabOrderRow[]>([]);
  const [banners, setBanners] = useState<PushLabBannerRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [sendBusy, setSendBusy] = useState<"device" | "broadcast" | null>(null);
  const [lastResult, setLastResult] = useState<PushTestSendResult | null>(null);
  const [laTokenCount, setLaTokenCount] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    if (!storeId) return;
    setLoadingOrders(true);
    const [orderRows, bannerRows, laCount] = await Promise.all([
      fetchPushLabOrders(storeId),
      fetchPushLabBanners(storeId),
      fetchStaffPushToStartTokenCount(storeId),
    ]);
    setOrders(orderRows);
    setBanners(bannerRows);
    setLaTokenCount(laCount);
    if (!orderId && orderRows[0]) setOrderId(orderRows[0].id);
    setLoadingOrders(false);
  }, [storeId, orderId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    setTitle(scenario.defaultTitle);
    setBody(scenario.defaultBody);
    if (!scenario.supportsImage) setImageUrl("");
  }, [scenarioId, scenario.defaultTitle, scenario.defaultBody, scenario.supportsImage]);

  const selectedOrder = orders.find((o) => o.id === orderId);

  const handleCreateOrder = async () => {
    if (!storeId) {
      toast.error("Escolha uma unidade");
      return;
    }
    setCreatingOrder(true);
    const row = await createPushLabTestOrder(storeId, "takeaway");
    setCreatingOrder(false);
    if (!row) {
      toast.error("Não foi possível criar o pedido teste");
      return;
    }
    toast.success(`Pedido teste #${String(row.order_number).padStart(4, "0")} criado`);
    setOrderId(row.id);
    await loadOrders();
  };

  const handleSend = async (target: "device" | "broadcast") => {
    if (!storeId) {
      toast.error("Escolha uma unidade");
      return;
    }
    if (scenario.needsOrder && !orderId) {
      toast.error("Escolha ou crie um pedido");
      return;
    }

    setSendBusy(target);
    setLastResult(null);
    try {
      const result = await sendPushLabScenario({
        storeId,
        scenario: scenarioId,
        target,
        title,
        body,
        imageUrl: scenario.supportsImage ? imageUrl : undefined,
        orderId: scenario.needsOrder ? orderId : undefined,
        customerEvent: scenario.needsCustomerEvent ? customerEvent : undefined,
      });
      setLastResult(result);
      if (result.ok) {
        toast.success(result.userMessage ?? `Enviado para ${result.sent ?? 0} dispositivo(s)`);
      } else {
        toast.error(result.userMessage ?? result.error ?? "Falha no envio");
      }
    } finally {
      setSendBusy(null);
    }
  };

  const previewTitle =
    title ||
    (scenarioId === "staff_new_order" && selectedOrder
      ? `Pedido #${String(selectedOrder.order_number).padStart(4, "0")}`
      : scenario.defaultTitle);
  const previewBody =
    body ||
    (scenarioId === "staff_new_order"
      ? "Novo pedido — toca ACEITAR no cartão ou abre o painel."
      : scenario.defaultBody);

  return (
    <div className="space-y-6 pb-10">
      <PremiumPageHeader
        title="Laboratório de envios"
        subtitle="Escolha o tipo de aviso, veja como vai ficar e dispare manualmente quando estiver pronto."
        icon={FlaskConical}
      />

      <AdminStoreSwitcher />

      {(scenarioId === "staff_new_order" || scenarioId === "staff_cancelled") && laTokenCount === 0 ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">O iPhone ainda não está pronto para o cartão grande</p>
            <p className="text-xs mt-1 opacity-90">
              Abra a app Kebab Turco no iPhone da equipa → Painel → Definições → desligue e volte a ligar
              «Notificações push». Depois feche a app completamente e faça um novo pedido teste com o ecrã
              bloqueado.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de teste</CardTitle>
              <CardDescription>Escolha a função que quer experimentar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {PUSH_LAB_SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenarioId(s.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    scenarioId === s.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conteúdo</CardTitle>
              <CardDescription>{scenario.hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenario.needsOrder ? (
                <div className="space-y-2">
                  <Label>Pedido</Label>
                  <div className="flex gap-2">
                    <Select value={orderId} onValueChange={setOrderId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Escolher pedido" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {formatOrderLabel(o)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => void loadOrders()}
                      disabled={loadingOrders}
                      title="Actualizar lista"
                    >
                      {loadingOrders ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleCreateOrder()}
                      disabled={creatingOrder || !storeId}
                    >
                      {creatingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                      Criar teste
                    </Button>
                  </div>
                </div>
              ) : null}

              {scenario.needsCustomerEvent ? (
                <div className="space-y-2">
                  <Label>Estado para o cliente</Label>
                  <Select value={customerEvent} onValueChange={(v) => setCustomerEvent(v as CustomerStatusEvent)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {!scenario.needsOrder || scenario.defaultTitle ? (
                <div className="space-y-2">
                  <Label htmlFor="lab-title">Título (opcional)</Label>
                  <Input
                    id="lab-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={scenario.defaultTitle || "Deixe vazio para texto automático"}
                  />
                </div>
              ) : null}

              {!scenario.needsOrder || scenario.defaultBody ? (
                <div className="space-y-2">
                  <Label htmlFor="lab-body">Mensagem (opcional)</Label>
                  <Textarea
                    id="lab-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={scenario.defaultBody || "Deixe vazio para texto automático"}
                    rows={3}
                  />
                </div>
              ) : null}

              {scenario.supportsImage ? (
                <div className="space-y-2">
                  <Label htmlFor="lab-image" className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Imagem (URL https)
                  </Label>
                  <Input
                    id="lab-image"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {banners.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {banners
                        .filter((b) => b.image_url)
                        .map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setImageUrl(b.image_url ?? "")}
                            className="h-14 w-20 rounded-lg border overflow-hidden hover:ring-2 ring-primary"
                          >
                            <img src={b.image_url!} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Esconder pré-visualização" : "Ver pré-visualização"}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSend("device")}
              disabled={Boolean(sendBusy) || !storeId}
            >
              {sendBusy === "device" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar para este dispositivo
            </Button>
            {scenarioId !== "simple_marketing" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSend("broadcast")}
                disabled={Boolean(sendBusy) || !storeId}
              >
                {sendBusy === "broadcast" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Enviar para todos
              </Button>
            ) : null}
          </div>

          {lastResult ? (
            <Card className={lastResult.ok ? "border-emerald-500/40" : "border-destructive/40"}>
              <CardContent className="pt-4 text-sm space-y-1">
                <p className="font-medium">{lastResult.ok ? "Resultado do envio" : "O envio falhou"}</p>
                {lastResult.userMessage ? <p className="text-muted-foreground">{lastResult.userMessage}</p> : null}
                <p className="text-xs text-muted-foreground">
                  Entregues: {lastResult.sent ?? 0}
                  {lastResult.sentApns ? ` · iPhone: ${lastResult.sentApns}` : ""}
                  {lastResult.sentFcm ? ` · Android: ${lastResult.sentFcm}` : ""}
                  {lastResult.sentWeb ? ` · Browser: ${lastResult.sentWeb}` : ""}
                  {lastResult.liveActivitySent != null ? ` · Cartões grandes: ${lastResult.liveActivitySent}` : ""}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {showPreview ? (
          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pré-visualização</CardTitle>
              <CardDescription>Assim deve aparecer antes de disparar.</CardDescription>
            </CardHeader>
            <CardContent>
              <PushPreviewCard
                title={previewTitle}
                body={previewBody}
                imageUrl={scenario.supportsImage ? imageUrl : undefined}
                liveActivity={scenario.showsLiveActivityPreview}
                liveKind={scenario.liveActivityKind}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
