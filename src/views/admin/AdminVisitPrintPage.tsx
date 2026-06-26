import { useCallback, useEffect, useState } from "react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { isGeneralAdmin } from "@/lib/projectAccess";
import { useResolvedStore } from "@/hooks/useResolvedStore";
import {
  DEMO_VISIT_COUPON_CODE,
  VISIT_BRIDGE_INSTALL,
  fetchVisitPrintConfig,
  isVisitBridgeOnline,
  printVisitDemoTest,
  saveVisitPrintConfig,
  type VisitPrintConfig,
} from "@/services/visitPrintService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  Loader2,
  MapPin,
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
  const { stores } = useResolvedStore();
  const [cfg, setCfg] = useState<VisitPrintConfig | null>(null);
  const [ip, setIp] = useState("");
  const [port, setPort] = useState(9100);
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [demoOrders, setDemoOrders] = useState<
    { id: string; order_number: string; created_at: string; store_id: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await fetchVisitPrintConfig();
      setCfg(c);
      if (c) {
        setIp(c.printer_ip);
        setPort(c.printer_port || 9100);
        if (c.target_store_id) setStoreId(c.target_store_id);
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
    const i = setInterval(() => void load(), 15000);
    return () => clearInterval(i);
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await saveVisitPrintConfig({
        printerIp: ip.trim(),
        printerPort: port || 9100,
        targetStoreId: storeId || null,
      });
      toast({ title: "Guardado", description: "Impressora de visita actualizada." });
      await load();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      await saveVisitPrintConfig({
        printerIp: ip.trim(),
        printerPort: port || 9100,
        targetStoreId: storeId || null,
      });
      const res = await printVisitDemoTest("Demonstração");
      if (res.success) {
        toast({
          title: "Teste enviado",
          description: "O programa no Mac deve imprimir em segundos (mesma Wi‑Fi).",
        });
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const bridgeOnline = isVisitBridgeOnline(cfg?.bridge_last_seen_at ?? null);

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
        subtitle="Demonstrar impressão em restaurantes novos usando o seu Mac na mesma Wi‑Fi."
        badge={
          <Badge variant={bridgeOnline ? "default" : "secondary"}>
            {bridgeOnline ? "Mac ligado" : "Mac offline"}
          </Badge>
        }
      />

      <Alert>
        <AlertTitle>Como funciona na visita</AlertTitle>
        <AlertDescription className="space-y-2 text-sm">
          <p>
            1. Instale o programa <strong>uma vez</strong> no Mac (instruções abaixo).
          </p>
          <p>
            2. No restaurante: mesma Wi‑Fi, coloque o <strong>IP e porta</strong> da impressora e guarde.
          </p>
          <p>
            3. Faça um pedido na <strong>app do cliente</strong> com o cupão{" "}
            <code className="bg-muted px-1 rounded">{DEMO_VISIT_COUPON_CODE}</code> (com a sua conta admin)
            — não paga nada e <strong>não aparece no painel da loja</strong>.
          </p>
          <p>4. O ticket imprime na impressora do restaurante através do seu Mac.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {bridgeOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            Estado do Mac
          </CardTitle>
          <CardDescription>
            {bridgeOnline
              ? "O programa de visita está activo no seu Mac."
              : "Abra o programa no terminal do Mac antes de testar."}
            {cfg?.bridge_last_seen_at
              ? ` · último sinal ${new Date(cfg.bridge_last_seen_at).toLocaleTimeString("pt-PT")}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground font-mono break-all">
            VISIT_OWNER_USER_ID: {cfg?.user_id ?? user?.id ?? "—"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => copyText(cfg?.user_id ?? user?.id ?? "")}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar ID para o ficheiro de configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Impressora desta visita</CardTitle>
          <CardDescription>Endereço na rede local do restaurante (muda em cada visita).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Unidade (nome no ticket)</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a loja" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Instalar uma vez no Mac
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Abra o Terminal na pasta do projeto.</li>
            <li>Corra os comandos abaixo (só na primeira vez).</li>
            <li>Edite o ficheiro em casa com a chave do Supabase e o ID copiado acima.</li>
            <li>Em cada visita: ligue o Mac à Wi‑Fi do restaurante e corra o último comando.</li>
          </ol>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{VISIT_BRIDGE_INSTALL}</pre>
          <Button type="button" variant="outline" size="sm" onClick={() => copyText(VISIT_BRIDGE_INSTALL)}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar comandos
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
