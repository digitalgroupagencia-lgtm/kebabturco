import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Wallet, Save, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { fetchStoreFinancialProfile } from "@/services/orderService";
import { stripeAdminConfigIssue } from "@/lib/paymentPolicy";
import { nav } from "@/lib/navPaths";

type Ops = Tables<"operations_settings">;

const PAY_FIELDS: { key: keyof Ops; label: string; desc: string }[] = [
  { key: "pay_card_enabled", label: "Tarjeta", desc: "Crédito / débito en TPV" },
  { key: "pay_cash_enabled", label: "Efectivo", desc: "Pago en efectivo" },
  { key: "pay_pix_enabled", label: "Pix", desc: "Pago instantáneo (BR)" },
  { key: "pay_apple_enabled", label: "Apple Pay", desc: "iPhone / Apple Watch" },
  { key: "pay_google_enabled", label: "Google Pay", desc: "Android" },
  { key: "pay_link_enabled", label: "Link de pago", desc: "Recibe enlace para pagar" },
  { key: "pay_counter_enabled", label: "Pagar en mostrador", desc: "Sin cobro online" },
];

const OperationsPage = () => {
  const { storeId: STORE_ID } = useAdminStoreId();
  const [s, setS] = useState<Ops | null>(null);
  const [saving, setSaving] = useState(false);
  const [onlineReady, setOnlineReady] = useState(false);

  useEffect(() => {
    if (!STORE_ID) return;
    supabase.from("operations_settings").select("*").eq("store_id", STORE_ID).maybeSingle()
      .then(({ data }) => setS(data ?? null));
    fetchStoreFinancialProfile(STORE_ID).then((data) => {
      if (!data) return;
      setOnlineReady(data.stripe_charges_enabled && data.stripe_onboarding_completed);
    });
  }, [STORE_ID]);

  const update = (k: keyof Ops, v: any) => setS((p) => p ? { ...p, [k]: v } as Ops : p);

  const save = async () => {
    if (!s || !STORE_ID) return;
    setSaving(true);
    const { error } = await supabase.from("operations_settings").update({
      payment_mode: s.payment_mode,
      pay_card_enabled: s.pay_card_enabled,
      pay_cash_enabled: s.pay_cash_enabled,
      pay_cash_dine_in: (s as any).pay_cash_dine_in ?? true,
      pay_cash_takeaway: (s as any).pay_cash_takeaway ?? false,
      pay_cash_delivery: (s as any).pay_cash_delivery ?? false,
      require_prepayment_takeaway: (s as any).require_prepayment_takeaway ?? true,
      require_prepayment_delivery: (s as any).require_prepayment_delivery ?? true,
      print_pending_dine_in: (s as any).print_pending_dine_in ?? true,
      pay_pix_enabled: s.pay_pix_enabled,
      pay_apple_enabled: s.pay_apple_enabled,
      pay_google_enabled: s.pay_google_enabled,
      pay_counter_enabled: s.pay_counter_enabled,
      pay_link_enabled: s.pay_link_enabled,
      msg_paid: s.msg_paid,
      msg_counter: s.msg_counter,
      avg_prep_minutes: (s as any).avg_prep_minutes ?? 12,
      require_phone_takeaway: (s as any).require_phone_takeaway ?? true,
    }).eq("store_id", STORE_ID);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Configuración guardada");
  };

  if (!s) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const stripePublishableKey = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  const stripeIssue = stripeAdminConfigIssue(onlineReady, stripePublishableKey);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5 sm:h-6 sm:w-6" /> Pagos</h2>
          <p className="text-sm text-muted-foreground mt-1">Define cómo cobrarás a tus clientes.</p>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar"}</Button>
      </div>

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
            Saldo, repasses e dados bancários são geridos na área <strong>Recebimentos</strong>. Taxa por pedido online: <strong>1€ + custo de processamento</strong>.
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
            <Link to="../finance">
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
          {[
            { key: "pay_cash_dine_in", label: "Dinheiro na mesa (QR)", desc: "Permite pagar em dinheiro num pedido de mesa validado." },
            { key: "pay_cash_takeaway", label: "Dinheiro ao recolher (takeaway)", desc: "Desligado por defeito — só active se quiser cobrar na recolha." },
            { key: "pay_cash_delivery", label: "Dinheiro na entrega", desc: "Desligado por defeito — só active se quiser cobrar na entrega." },
            { key: "require_prepayment_takeaway", label: "Takeaway: pagar antes de enviar", desc: "Cliente só conclui após pagamento online confirmado." },
            { key: "require_prepayment_delivery", label: "Entrega: pagar antes de enviar", desc: "Cliente só conclui após pagamento online confirmado." },
            { key: "print_pending_dine_in", label: "Imprimir mesa QR mesmo pendente", desc: "Envia para cozinha após pedido de mesa validado, mesmo sem pagamento." },
          ].map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20">
              <div className="min-w-0 flex-1">
                <Label className="text-base">{f.label}</Label>
                <p className="text-xs text-muted-foreground line-clamp-3">{f.desc}</p>
              </div>
              <Switch
                checked={Boolean((s as any)[f.key])}
                onCheckedChange={(v) => update(f.key as keyof Ops, v as any)}
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
              checked={Boolean((s as any).require_phone_takeaway ?? true)}
              onCheckedChange={(v) => update("require_phone_takeaway" as any, v)}
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
              value={(s as any).avg_prep_minutes ?? 12}
              onChange={(e) => update("avg_prep_minutes" as any, Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">Aparece en la pantalla de confirmación del totem.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsPage;
