import { useCallback, useEffect, useState } from "react";
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
  const [localMac, setLocalMac] = useState<LocalMacStatus | null>(null);
  const [demoOrders, setDemoOrders] = useState<
    { id: string; order_number: string; created_at: string; store_id: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, local] = await Promise.all([fetchVisitPrintConfig(), probeLocalMacPrint()]);
      setLocalMac(local);
      setCfg(c);
      if (c) {
        setRestaurantName(c.restaurant_display_name || "");
        setIp(c.printer_ip);
        setPort(c.printer_port || 9100);
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
    void load();
    const i = setInterval(() => void load(), 8000);
    return () => clearInterval(i);
  }, [load]);

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
      toast({ title: "Guardado", description: "Dados desta visita actualizados." });
      await load();
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
        toast({
          title: "Helper offline",
          description:
            "No Mac: abra o Terminal na pasta do projeto e corra «npm run visit-print:helper» (uma vez por sessão). Depois volte a carregar aqui.",
          variant: "destructive",
        });
        copyText(VISIT_HELPER_ONLY);
        return;
      }
      toast({
        title: result.already_running ? "Mac já estava ligado" : "Impressão iniciada no Mac",
        description: "Pode enviar teste ou usar o cupão na app do cliente.",
      });
      await new Promise((r) => setTimeout(r, 1500));
      await load();
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
          title: "Teste enviado",
          description: `Ticket de «${restaurantName.trim()}» a imprimir…`,
        });
      } else {
        throw new Error(res.error);
      }
      await load();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const cloudOnline = isVisitBridgeOnline(cfg?.bridge_last_seen_at ?? null);
  const macReady = Boolean(localMac?.bridge_running || cloudOnline);

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
            {macReady ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            Ligação com o Mac
          </CardTitle>
          <CardDescription>
            {localMac?.helper_online
              ? "Helper local detectado no seu Mac."
              : "Helper local não detectado — inicie com o botão ou no Terminal."}
            {localMac?.bridge_running || cloudOnline
              ? " · impressão activa"
              : " · impressão parada"}
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
          <p className="text-xs text-muted-foreground font-mono break-all">
            ID: {cfg?.user_id ?? user?.id ?? "—"}
          </p>
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
            <code className="text-xs bg-muted px-1 rounded">scripts/Visit-Print-Helper.command</code> no Finder.
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
