import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wallet, Save, CreditCard, ArrowRight, CheckCircle2, Copy, AlertTriangle } from "lucide-react";
import { BIZUM_COLUMN_ACTIVATION_SQL } from "@/lib/checkoutActivationSql";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { fetchStoreFinancialProfile } from "@/services/orderService";
import { loadOperationsSettingsForStore } from "@/lib/operationsSettingsAdmin";
import { isStripeConnectReady } from "@/lib/stripeConnectReady";
import { stripeAdminConfigIssue } from "@/lib/paymentPolicy";
import { nav } from "@/lib/navPaths";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";

type Ops = Tables<"operations_settings">;

const PAY_FIELDS: { key: keyof Ops; label: string; desc: string }[] = [
  { key: "pay_card_enabled", label: "Tarjeta", desc: "Crédito / débito en TPV" },
  { key: "pay_bizum_enabled", label: "Bizum", desc: "Pago móvil instantáneo (España)" },
  { key: "pay_cash_enabled", label: "Efectivo", desc: "Pago en efectivo" },
  { key: "pay_pix_enabled", label: "Pix", desc: "Pago instantáneo (BR)" },
  { key: "pay_apple_enabled", label: "Apple Pay", desc: "iPhone / Apple Watch" },
  { key: "pay_google_enabled", label: "Google Pay", desc: "Android" },
  { key: "pay_link_enabled", label: "Link de pago", desc: "Recibe enlace para pagar" },
  { key: "pay_counter_enabled", label: "Pagar en mostrador", desc: "Sin cobro online" },
];

const RULE_FIELDS: { key: keyof Ops; label: string; desc: string }[] = [
  { key: "pay_cash_dine_in", label: "Dinheiro na mesa (QR)", desc: "Permite pagar em dinheiro num pedido de mesa validado." },
  { key: "require_prepayment_delivery", label: "Entrega: pagar antes de enviar", desc: "Cliente só conclui após pagamento online confirmado." },
  { key: "print_pending_dine_in", label: "Imprimir mesa QR mesmo pendente", desc: "Envia para cozinha após pedido de mesa validado, mesmo sem pagamento." },
];

const OperationsPage = () => {
  const { storeId: STORE_ID, loading: loadingStore } = useAdminStoreId();
  const [s, setS] = useState<Ops | null>(null);
  const [loadingOps, setLoadingOps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onlineReady, setOnlineReady] = useState(false);
  const [bizumColumnReady, setBizumColumnReady] = useState(true);
  const [copyingSql, setCopyingSql] = useState(false);

  const isBizumSchemaError = (message: string) =>
    /pay_bizum_enabled|schema cache/i.test(message);

  const probeBizumColumn = async (storeId: string) => {
    const { error } = await supabase
      .from("operations_settings")
      .select("pay_bizum_enabled")
      .eq("store_id", storeId)
      .limit(1);
    if (!error) setBizumColumnReady(true);
    else if (isBizumSchemaError(error.message)) setBizumColumnReady(false);
  };

  const copyBizumSql = async () => {
    setCopyingSql(true);
    try {
      await navigator.clipboard.writeText(BIZUM_COLUMN_ACTIVATION_SQL);
      toast.success("Comando copiado — cole na base de dados da Lovable e execute.");
    } catch {
      toast.error("Não foi possível copiar. Abra Cloud → Base de dados na Lovable.");
    } finally {
      setCopyingSql(false);
    }
  };

  const buildSavePayload = (row: Ops, includeBizum: boolean) => {
    const payload: any = {
      payment_mode: row.payment_mode,
      pay_card_enabled: row.pay_card_enabled,
      pay_cash_enabled: row.pay_cash_enabled ?? true,
      pay_cash_dine_in: row.pay_cash_dine_in ?? true,
      pay_cash_takeaway: true,
      pay_cash_delivery: true,
      require_prepayment_takeaway: false,
      require_prepayment_delivery: row.require_prepayment_delivery ?? false,
      print_pending_dine_in: row.print_pending_dine_in ?? true,
      pay_pix_enabled: row.pay_pix_enabled,
      pay_apple_enabled: row.pay_apple_enabled,
      pay_google_enabled: row.pay_google_enabled,
      pay_counter_enabled: row.pay_counter_enabled,
      pay_link_enabled: row.pay_link_enabled,
      msg_paid: row.msg_paid,
      msg_counter: row.msg_counter,
      avg_prep_minutes: row.avg_prep_minutes ?? 12,
      require_phone_takeaway: row.require_phone_takeaway ?? true,
    };
    if (includeBizum) {
      payload.pay_bizum_enabled = row.pay_bizum_enabled ?? true;
    }
    return payload;
  };

  useEffect(() => {
    if (!STORE_ID) {
      setLoadingOps(false);
      return;
    }
    setLoadingOps(true);
    void loadOperationsSettingsForStore(STORE_ID).then((data) => {
      setS(data);
      setLoadingOps(false);
    });
    void probeBizumColumn(STORE_ID);
    void fetchStoreFinancialProfile(STORE_ID)
      .then((data) => setOnlineReady(isStripeConnectReady(data)))
      .catch(() => setOnlineReady(false));
  }, [STORE_ID]);

  const update = (k: keyof Ops, v: Ops[keyof Ops]) => setS((p) => p ? { ...p, [k]: v } : p);

  const save = async () => {
    if (!s || !STORE_ID) return;
    setSaving(true);
    try {
      let includeBizum = bizumColumnReady;
      let { error } = await supabase
        .from("operations_settings")
        .update(buildSavePayload(s, includeBizum))
        .eq("store_id", STORE_ID);

      if (error && isBizumSchemaError(error.message) && includeBizum) {
        setBizumColumnReady(false);
        ({ error } = await supabase
          .from("operations_settings")
          .update(buildSavePayload(s, false))
          .eq("store_id", STORE_ID));
        if (!error) {
          toast.warning(
            "Tarjeta e efectivo guardados. Para activar Bizum, copie o comando abaixo, execute na base de dados da Lovable e volte a Guardar.",
          );
          return;
        }
      }

      if (error) {
        toast.error(error.message);
        return;
      }

      if (includeBizum) {
        setBizumColumnReady(true);
        toast.success("Configuración guardada");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingStore || loadingOps) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  if (!STORE_ID || !s) {
    return (
      <div className="p-8 text-muted-foreground">
        Não foi possível carregar as definições de pagamento para esta unidade.
      </div>
    );
  }

  const stripeIssue = onlineReady
    ? null
    : stripeAdminConfigIssue(false, true);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <PremiumPageHeader
        icon={Wallet}
        title="Pagos"
        subtitle="Define cómo cobrarás a tus clientes."
        actions={
          <Button onClick={save} disabled={saving} size="sm" className="h-9">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        }
      />

      {stripeIssue && (
        <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 space-y-2">
          <p className="font-bold text-sm text-destructive">{stripeIssue.message}</p>
          <p className="text-xs text-muted-foreground">{stripeIssue.action}</p>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to={nav.admin("diagnostics")}>Abrir Estado do sistema</Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" /> Pagos online</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Saldo, repasses e dados bancários são geridos na área <strong>Recebimentos</strong>. Taxa da plataforma: <strong>€0,50 em pedidos abaixo de €10 · €1 a partir de €10</strong> (+ custo do cartão/Bizum).
          </p>
          {onlineReady ? (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Recebimentos online activos
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-800 dark:text-amber-300">
              Complete os dados bancários para activar pagamentos com cartão online.
            </div>
          )}
          <Button asChild variant={onlineReady ? "outline" : "default"} className="gap-2">
            <Link to={nav.admin("finance")}>
              Ir para Recebimentos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Modo de pago</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["online", "counter", "mixed"] as const).map((m) => (
            <button key={m} onClick={() => update("payment_mode", m)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                s.payment_mode === m ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
              }`}>
              <p className="font-bold capitalize">
                {m === "online" ? "Solo online" : m === "counter" ? "Solo mostrador" : "Mixto"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {m === "online" ? "Cliente paga en el totem" : m === "counter" ? "Pedido sin cobro" : "Cliente elige"}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Regras por tipo de pedido</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {RULE_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
              <div className="min-w-0 flex-1">
                <Label className="text-base">{f.label}</Label>
                <p className="text-xs text-muted-foreground line-clamp-3">{f.desc}</p>
              </div>
              <Switch
                checked={Boolean(s[f.key])}
                onCheckedChange={(v) => update(f.key, v)}
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {!bizumColumnReady && (
        <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Bizum: falta um passo na base de dados da Lovable
          </p>
          <p className="text-xs text-muted-foreground">
            Copie o comando, abra <strong>Cloud → Base de dados</strong> na Lovable, cole, execute, e depois carregue em Guardar outra vez.
          </p>
          <Button type="button" variant="default" size="sm" className="gap-2" onClick={() => void copyBizumSql()} disabled={copyingSql}>
            <Copy className="h-4 w-4" />
            {copyingSql ? "A copiar…" : "Copiar comando de activação Bizum"}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Métodos habilitados (legado)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {PAY_FIELDS.map((f) => (
            <div key={String(f.key)} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
              <div className="min-w-0 flex-1">
                <Label className="text-base">{f.label}</Label>
                <p className="text-xs text-muted-foreground line-clamp-2">{f.desc}</p>
              </div>
              <Switch checked={Boolean(s[f.key])} onCheckedChange={(v) => update(f.key, v)} className="shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
            <div className="min-w-0 flex-1">
              <Label className="text-base">Teléfono obligatorio en pedidos para llevar</Label>
              <p className="text-xs text-muted-foreground">El nombre siempre es obligatorio. Activa esto para pedir también el teléfono.</p>
            </div>
            <Switch
              checked={Boolean(s.require_phone_takeaway ?? true)}
              onCheckedChange={(v) => update("require_phone_takeaway", v)}
              className="shrink-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Mensajes de confirmación</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Mensaje cuando el pago fue confirmado</Label>
            <Input value={s.msg_paid} onChange={(e) => update("msg_paid", e.target.value)} />
          </div>
          <div>
            <Label>Mensaje para pagar en mostrador</Label>
            <Input value={s.msg_counter} onChange={(e) => update("msg_counter", e.target.value)} />
          </div>
          <div>
            <Label>Tiempo medio de preparación (minutos)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={s.avg_prep_minutes ?? 12}
              onChange={(e) => update("avg_prep_minutes", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">Aparece en la pantalla de confirmación del totem.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsPage;
