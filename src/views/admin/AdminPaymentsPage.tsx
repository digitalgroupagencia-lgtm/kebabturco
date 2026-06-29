import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, CreditCard, Smartphone, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import HowToUsePanel from "@/components/admin/HowToUsePanel";

type Status = "disabled" | "sandbox" | "production";

type StoreRow = { id: string; name: string };

type GatewayCfg = {
  id?: string;
  store_id: string;
  gateway_code: string;
  status: Status;
  merchant_code: string | null;
  terminal: string | null;
  secret_key: string | null;
  currency: string | null;
  transaction_type: string | null;
  merchant_name: string | null;
  success_url: string | null;
  failure_url: string | null;
  notification_url: string | null;
  last_test_at: string | null;
  last_test_success: boolean | null;
  last_test_message: string | null;
};

const GATEWAYS = [
  { code: "stripe", label: "Stripe", icon: CreditCard, note: "Gestão completa via Connect — usar Admin > Stripe Connect." },
  { code: "redsys", label: "Redsys (TPV)", icon: ShieldCheck, note: "TPV Virtual para Espanha. Configure FUC, Terminal e Clave secreta." },
  { code: "bizum", label: "Bizum", icon: Smartphone, note: "Reaproveita arquitetura Redsys (paymethod \"z\")." },
] as const;

export default function AdminPaymentsPage() {
  const qc = useQueryClient();
  const [storeId, setStoreId] = useState<string>("");
  const { data: stores = [] } = useQuery<StoreRow[]>({
    queryKey: ["admin-payments-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!storeId && stores.length) setStoreId(stores[0].id);
  }, [stores, storeId]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pagamentos"
        description="Gateways disponíveis na plataforma. Mantém Stripe, Redsys e Bizum configurados por loja."
      />

      <HowToUsePanel
        purpose="Configurar credenciais reais de Stripe / Redsys / Bizum por loja. Só admin master."
        whenToUse="Ao receber as chaves do banco / Stripe Connect, ou ao testar antes de activar para o cliente."
        steps={[
          "Escolha a loja no selector lateral.",
          "Em cada gateway clique 'Editar credenciais' e cole os dados (FUC, terminal, secret key SHA-256 para Redsys; conectar Stripe Express).",
          "Salve. As credenciais ficam cifradas em store_payment_gateways.credentials.",
          "Clique 'Testar ligação' para validar antes de mudar status.",
          "Quando estiver OK, o dono activa o método em /panel/payments.",
        ]}
        howToConfirm="O badge da loja muda para 'Sandbox' ou 'Production' (verde) e o teste de ligação devolve OK."
        assistantQuestion="Por que Redsys precisa de SHA-256 e o que acontece se eu usar a chave errada?"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Loja em edição</CardTitle>
            <CardDescription>Cada loja tem credenciais próprias.</CardDescription>
          </div>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Selecionar loja" /></SelectTrigger>
            <SelectContent>
              {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
      </Card>

      {storeId && (
        <Tabs defaultValue="redsys" className="space-y-4">
          <TabsList>
            {GATEWAYS.map((g) => (
              <TabsTrigger key={g.code} value={g.code} className="gap-2">
                <g.icon className="h-4 w-4" /> {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GATEWAYS.map((g) => (
            <TabsContent key={g.code} value={g.code}>
              <GatewayEditor storeId={storeId} gatewayCode={g.code} note={g.note} onSaved={() => qc.invalidateQueries()} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function GatewayEditor({ storeId, gatewayCode, note, onSaved }: { storeId: string; gatewayCode: string; note: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<GatewayCfg | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("store_payment_gateways")
        .select("*")
        .eq("store_id", storeId)
        .eq("gateway_code", gatewayCode)
        .maybeSingle();
      if (!alive) return;
      setCfg(
        (data as GatewayCfg | null) ?? {
          store_id: storeId,
          gateway_code: gatewayCode,
          status: "disabled",
          merchant_code: "",
          terminal: "001",
          secret_key: "",
          currency: "978",
          transaction_type: "0",
          merchant_name: "",
          success_url: "",
          failure_url: "",
          notification_url: `https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/redsys-webhook${gatewayCode === "bizum" ? "?gateway=bizum" : ""}`,
          last_test_at: null,
          last_test_success: null,
          last_test_message: null,
        },
      );
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [storeId, gatewayCode]);

  const isStripe = gatewayCode === "stripe";

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    const payload = { ...cfg, store_id: storeId, gateway_code: gatewayCode };
    delete (payload as { id?: string }).id;
    const { error } = await supabase
      .from("store_payment_gateways")
      .upsert(payload, { onConflict: "store_id,gateway_code" });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Configuração guardada"); onSaved(); }
  };

  const test = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("payment-gateway-test", {
      body: { storeId, gateway: gatewayCode },
    });
    setTesting(false);
    if (error) { toast.error(error.message); return; }
    const ok = (data as { success?: boolean })?.success;
    const msg = (data as { message?: string })?.message ?? "";
    if (ok) toast.success(msg); else toast.warning(msg || "Configuração incompleta");
  };

  if (loading || !cfg) {
    return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Configuração — {gatewayCode}</span>
          <Badge variant={cfg.status === "production" ? "default" : cfg.status === "sandbox" ? "secondary" : "outline"}>
            {cfg.status}
          </Badge>
        </CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isStripe ? (
          <p className="text-sm text-muted-foreground">
            Stripe é gerido pelo módulo Connect em Admin → Stripe Connect. Esta aba apenas regista o estado para relatórios.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Merchant Code (FUC)"><Input value={cfg.merchant_code ?? ""} onChange={(e) => setCfg({ ...cfg, merchant_code: e.target.value })} placeholder="123456789" /></Field>
            <Field label="Terminal"><Input value={cfg.terminal ?? ""} onChange={(e) => setCfg({ ...cfg, terminal: e.target.value })} placeholder="001" /></Field>
            <Field label="Secret Key (Clave SHA-256)"><SecretInput value={cfg.secret_key ?? ""} onChange={(e) => setCfg({ ...cfg, secret_key: e.target.value })} placeholder="Base64..." /></Field>
            <Field label="Moeda (ISO numérica)"><Input value={cfg.currency ?? ""} onChange={(e) => setCfg({ ...cfg, currency: e.target.value })} placeholder="978" /></Field>
            <Field label="Tipo de transação"><Input value={cfg.transaction_type ?? ""} onChange={(e) => setCfg({ ...cfg, transaction_type: e.target.value })} placeholder="0" /></Field>
            <Field label="Nome do comerciante"><Input value={cfg.merchant_name ?? ""} onChange={(e) => setCfg({ ...cfg, merchant_name: e.target.value })} placeholder="Kebab Turco" /></Field>
            <Field label="URL Sucesso"><Input value={cfg.success_url ?? ""} onChange={(e) => setCfg({ ...cfg, success_url: e.target.value })} /></Field>
            <Field label="URL Falha"><Input value={cfg.failure_url ?? ""} onChange={(e) => setCfg({ ...cfg, failure_url: e.target.value })} /></Field>
            <Field label="URL Notificação (Callback)" className="md:col-span-2"><Input value={cfg.notification_url ?? ""} onChange={(e) => setCfg({ ...cfg, notification_url: e.target.value })} /></Field>
          </div>
        )}

        <Field label="Estado">
          <Select value={cfg.status} onValueChange={(v) => setCfg({ ...cfg, status: v as Status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disabled">Desativado</SelectItem>
              <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
              <SelectItem value="production">Produção</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {cfg.last_test_at && (
          <div className={`text-sm rounded-md p-3 ${cfg.last_test_success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            <div className="flex items-center gap-2 font-medium">
              {cfg.last_test_success ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              Último teste: {new Date(cfg.last_test_at).toLocaleString()}
            </div>
            <p className="text-xs mt-1">{cfg.last_test_message}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar</Button>
          <Button variant="outline" onClick={test} disabled={testing}><RefreshCw className={`h-4 w-4 mr-2 ${testing ? "animate-spin" : ""}`} />Testar conexão</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
