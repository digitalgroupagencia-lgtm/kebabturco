import { useCallback, useEffect, useRef, useState } from "react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isGeneralAdmin } from "@/lib/projectAccess";
import {
  DEMO_VISIT_COUPON_CODE,
  VISIT_BRIDGE_INSTALL,
  VISIT_HELPER_ONLY,
  fetchVisitPrintConfig,
  isVisitBridgeOnline,
  printVisitDemoTest,
  probeLocalMacPrint,
  saveVisitPrintConfig,
  startLocalMacPrintBridge,
  type LocalMacStatus,
  type VisitPrintConfig,
} from "@/services/visitPrintService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  Loader2,
  MapPin,
  Play,
  Printer,
  Save,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
  toast({ title: "Copiado" });
}

export default function AdminVisitPrintPage() {
  const { user } = useAuth();
  const { roleData, loading: roleLoading } = useUserRole(user?.id);
  const [cfg, setCfg] = useState<VisitPrintConfig | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState(9100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectingMac, setConnectingMac] = useState(false);
  const [bridgeOptimistic, setBridgeOptimistic] = useState(false);
  const [localMac, setLocalMac] = useState<LocalMacStatus | null>(null);
  const [demoOrders, setDemoOrders] = useState<
    { id: string; order_number: string; created_at: string; store_id: string }[]
  >([]);
  const formHydrated = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      const [c, local] = await Promise.all([fetchVisitPrintConfig(), probeLocalMacPrint()]);
      setLocalMac(local);
      setCfg(c);
      if (local.bridge_running || isVisitBridgeOnline(c?.bridge_last_seen_at ?? null)) {
        setBridgeOptimistic(true);
      }
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, created_at, store_id")
        .eq("is_test", true)
        .ilike("notes", "%DEMO VISITA%")
        .order("created_at", { ascending: false })
        .limit(15);
      setDemoOrders(data ?? []);
    } catch {
      /* silencioso no refresh de fundo */
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [c, local] = await Promise.all([fetchVisitPrintConfig(), probeLocalMacPrint()]);
      setLocalMac(local);
      setCfg(c);
      if (c && !formHydrated.current) {
        setRestaurantName(c.restaurant_display_name || "");
        setIp(c.printer_ip);
        setPort(c.printer_port || 9100);
        formHydrated.current = true;
      }
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, created_at, store_id")
        .eq("is_test", true)
        .ilike("notes", "%DEMO VISITA%")
        .order("created_at", { ascending: false })
        .limit(15);
      setDemoOrders(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
    const i = setInterval(() => void refreshStatus(), 12000);
    return () => clearInterval(i);
  }, [loadInitial, refreshStatus]);

  const persistConfig = async () => {
    await saveVisitPrintConfig({
      printerIp: ip.trim(),
      printerPort: port || 9100,
      restaurantDisplayName: restaurantName.trim(),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await persistConfig();
      formHydrated.current = true;
      toast({ title: "Guardado", description: "Dados desta visita actualizados." });
      await refreshStatus();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const connectMac = async () => {
    setConnectingMac(true);
    try {
      const result = await startLocalMacPrintBridge();
      if (!result.ok) {
        setBridgeOptimistic(false);
        toast({
          title: "Helper offline",
          description:
            result.error ||
            "No Mac: abra o Terminal na pasta do projeto e corra «npm run visit-print:helper» (uma vez por sessão). Depois volte a carregar aqui.",
          variant: "destructive",
        });
        copyText(VISIT_HELPER_ONLY);
        return;
      }
      setBridgeOptimistic(true);
      toast({
        title: result.already_running ? "Mac já estava ligado" : "Impressão iniciada no Mac",
        description: "Pode enviar teste ou usar o cupão na app do cliente.",
      });
      await refreshStatus();
    } finally {
      setConnectingMac(false);
    }
  };

  const runTest = async () => {
    if (!restaurantName.trim()) {
      toast({
        title: "Falta o nome",
        description: "Escreva o nome do restaurante que está a visitar.",
        variant: "destructive",
      });
      return;
    }
    setTesting(true);
    try {
      await persistConfig();
      const local = await probeLocalMacPrint();
      if (!local.bridge_running && !isVisitBridgeOnline(cfg?.bridge_last_seen_at ?? null)) {
        const started = await startLocalMacPrintBridge();
        if (!started.ok) {
          throw new Error("Ligue o Mac primeiro com o botão «Ligar Mac».");
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      const res = await printVisitDemoTest();
      if (res.success) {
        toast({
          title: res.direct ? "A imprimir agora" : "Teste enviado",
          description: res.direct
            ? `Ticket de «${restaurantName.trim()}» enviado directo para a impressora.`
            : `Ticket de «${restaurantName.trim()}» a imprimir…`,
        });
      } else {
        throw new Error(res.error);
      }
      await refreshStatus();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const clearVisitForm = () => {
    setRestaurantName("");
    setIp("");
    setPort(9100);
    formHydrated.current = true;
    toast({ title: "Campos limpos", description: "Preencha o próximo restaurante e guarde." });
  };

  const cloudOnline = isVisitBridgeOnline(cfg?.bridge_last_seen_at ?? null);
  const bridgeActive = Boolean(localMac?.bridge_running || cloudOnline || bridgeOptimistic);
  const helperOnline = Boolean(localMac?.helper_online);
  const macReady = bridgeActive;

  const connectionStatus = bridgeActive
    ? { icon: Wifi, className: "text-green-600", label: "Impressão activa no Mac" }
    : helperOnline
      ? { icon: Wifi, className: "text-amber-500", label: "Helper activo — carregue «Ligar Mac»" }
      : { icon: WifiOff, className: "text-muted-foreground", label: "Helper offline no Mac" };

  const StatusIcon = connectionStatus.icon;
  const ownerUserId = cfg?.user_id ?? user?.id ?? "";

  if (roleLoading || loading) {
    return <div className="p-8 text-muted-foreground">A carregar…</div>;
  }

  if (!isGeneralAdmin(roleData?.role)) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertTitle>Acesso restrito</AlertTitle>
        <AlertDescription>Só o Admin Master pode usar o modo visita.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PremiumPageHeader
        icon={MapPin}
        title="Demo visita"
        subtitle="Demonstrar impressão em restaurantes novos — Mac na mesma Wi‑Fi."
        badge={
          <Badge variant={macReady ? "default" : "secondary"}>
            {macReady ? "Pronto a imprimir" : "Mac por ligar"}
          </Badge>
        }
      />

      <Alert>
        <AlertTitle>Fluxo rápido na visita</AlertTitle>
        <AlertDescription className="space-y-2 text-sm">
          <p>1. Nome do restaurante + IP + porta → <strong>Guardar</strong></p>
          <p>2. <strong>Ligar Mac</strong> (só precisa do helper activo uma vez por sessão)</p>
          <p>3. <strong>Imprimir teste</strong> ou pedido na app com cupão <code className="bg-muted px-1 rounded">{DEMO_VISIT_COUPON_CODE}</code></p>
          <p>O ticket mostra o <strong>nome que escreveu</strong>. Não precisa escolher loja nem ligar «impressão automática» na configuração oficial.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${connectionStatus.className}`} />
            Ligação com o Mac
          </CardTitle>
          <CardDescription>
            {connectionStatus.label}
            {helperOnline && !bridgeActive ? " · impressão parada" : ""}
            {bridgeActive ? " · pronto a imprimir" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void connectMac()} disabled={connectingMac}>
              {connectingMac ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Ligar Mac
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copyText(VISIT_HELPER_ONLY)}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copiar comando helper
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Na primeira vez do dia: no Terminal do Mac, na pasta do projeto,{" "}
            <code className="bg-muted px-1 rounded">npm run visit-print:helper</code> e deixe aberto.
            Depois «Ligar Mac» no painel inicia a impressão sem mais comandos.
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 rounded-lg px-3 py-2">
            <strong>Primeira vez no Mac?</strong> Corra{" "}
            <code className="bg-muted px-1 rounded">npm run visit-print:setup</code> no Terminal.
            Não precisa da chave secreta do Supabase — só da chave pública do site, um código que você
            cria (e põe igual no Lovable → Secrets → VISIT_BRIDGE_TOKEN) e o ID abaixo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p className="text-xs text-muted-foreground shrink-0">O seu ID (para o setup no Mac):</p>
            <code className="text-xs font-mono bg-muted px-2 py-1.5 rounded break-all select-text flex-1 min-w-0">
              {ownerUserId || "—"}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={!ownerUserId}
              onClick={() => copyText(ownerUserId)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copiar ID
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Impressora desta visita</CardTitle>
          <CardDescription>
            Só para demonstrações em restaurantes novos — independente da loja oficial do projeto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome do restaurante (no ticket)</Label>
            <Input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Ex.: Pizzeria Roma"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>IP da impressora</Label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.100"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Porta</Label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || 9100)}
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void runTest()} disabled={testing}>
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Imprimir teste
            </Button>
            <Button type="button" variant="outline" onClick={clearVisitForm}>
              Limpar para próxima visita
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Impressão automática da loja oficial <strong>não é necessária</strong> — basta Mac ligado, IP correcto e «Imprimir teste».
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Instalação única no Mac
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Também pode dar duplo clique em{" "}
            <code className="text-xs bg-muted px-1 rounded">Demo Visita - Ligar Mac</code> na Mesa do Mac.
          </p>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{VISIT_BRIDGE_INSTALL}</pre>
          <Button type="button" variant="outline" size="sm" onClick={() => copyText(VISIT_BRIDGE_INSTALL)}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar instruções
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos demo (só aqui)</CardTitle>
          <CardDescription>Não aparecem no painel oficial do restaurante.</CardDescription>
        </CardHeader>
        <CardContent>
          {demoOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda sem demonstrações com cupão {DEMO_VISIT_COUPON_CODE}.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {demoOrders.map((o) => (
                <li key={o.id} className="flex justify-between border-b border-border pb-2">
                  <span className="font-medium">#{o.order_number}</span>
                  <span className="text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-PT")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
