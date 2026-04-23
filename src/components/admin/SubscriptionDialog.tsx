import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  tenantName: string;
}

const SubscriptionDialog = ({ open, onOpenChange, tenantId, tenantName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [sub, setSub] = useState({
    monthly_amount: "0",
    currency: "BRL",
    billing_day: "1",
    next_due_date: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    status: "pending",
    notes: "",
    setup_fee: "0",
    sellers_included: "1",
    sellers_allowed: "1",
    extra_seller_price: "0",
  });
  const [activeSellers, setActiveSellers] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.from("tenant_subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("payment_history").select("*").eq("tenant_id", tenantId).order("paid_at", { ascending: false }).limit(20),
      supabase.rpc("count_active_sellers" as any, { _tenant_id: tenantId }),
    ]).then(([s, h, c]: any[]) => {
      if (s.data) {
        setSub({
          monthly_amount: String(s.data.monthly_amount),
          currency: s.data.currency,
          billing_day: String(s.data.billing_day),
          next_due_date: s.data.next_due_date,
          status: s.data.status,
          notes: s.data.notes || "",
          setup_fee: String(s.data.setup_fee ?? 0),
          sellers_included: String(s.data.sellers_included ?? 1),
          sellers_allowed: String(s.data.sellers_allowed ?? s.data.sellers_included ?? 1),
          extra_seller_price: String(s.data.extra_seller_price ?? 0),
        });
        const incl = Number(s.data.sellers_included ?? 1);
        const allowed = Number(s.data.sellers_allowed ?? incl);
        const extras = Math.max(allowed - incl, 0);
        const total = Number(s.data.monthly_amount) + extras * Number(s.data.extra_seller_price ?? 0);
        setPaymentAmount(String(total.toFixed(2)));
      }
      setHistory(h.data || []);
      setActiveSellers(Number(c?.data ?? 0));
      setLoading(false);
    });
  }, [open, tenantId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("tenant_subscriptions").upsert({
      tenant_id: tenantId,
      monthly_amount: Number(sub.monthly_amount),
      currency: sub.currency,
      billing_day: Number(sub.billing_day),
      next_due_date: sub.next_due_date,
      status: sub.status,
      notes: sub.notes,
      setup_fee: Number(sub.setup_fee || 0),
      sellers_included: Number(sub.sellers_included || 1),
      sellers_allowed: Number(sub.sellers_allowed || 1),
      extra_seller_price: Number(sub.extra_seller_price || 0),
    }, { onConflict: "tenant_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Assinatura salva");
  };

  const recordPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) { toast.error("Informe um valor válido"); return; }
    setRecordingPayment(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const nextDue = format(addMonths(new Date(), 1), "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();
    const [{ error: payErr }, { error: subErr }] = await Promise.all([
      supabase.from("payment_history").insert({
        tenant_id: tenantId,
        amount: Number(paymentAmount),
        currency: sub.currency,
        paid_at: today,
        method: "manual",
        created_by: user?.id,
      }),
      supabase.from("tenant_subscriptions").update({
        last_payment_date: today,
        next_due_date: nextDue,
        status: "paid",
      }).eq("tenant_id", tenantId),
    ]);
    setRecordingPayment(false);
    if (payErr || subErr) { toast.error((payErr || subErr)?.message || "Erro"); return; }
    toast.success("Pagamento registrado");
    // refresh
    const { data: h } = await supabase.from("payment_history").select("*").eq("tenant_id", tenantId).order("paid_at", { ascending: false }).limit(20);
    setHistory(h || []);
    setSub((s) => ({ ...s, status: "paid", next_due_date: nextDue }));
  };

  const fmtMoney = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: sub.currency || "BRL" }).format(v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Assinatura · {tenantName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor mensal</Label>
                <Input type="number" step="0.01" value={sub.monthly_amount} onChange={(e) => setSub({ ...sub, monthly_amount: e.target.value })} />
              </div>
              <div>
                <Label>Moeda</Label>
                <Select value={sub.currency} onValueChange={(v) => setSub({ ...sub, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dia de vencimento</Label>
                <Input type="number" min="1" max="28" value={sub.billing_day} onChange={(e) => setSub({ ...sub, billing_day: e.target.value })} />
              </div>
              <div>
                <Label>Próximo vencimento</Label>
                <Input type="date" value={sub.next_due_date} onChange={(e) => setSub({ ...sub, next_due_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Status</Label>
                <Select value={sub.status} onValueChange={(v) => setSub({ ...sub, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Input value={sub.notes} onChange={(e) => setSub({ ...sub, notes: e.target.value })} placeholder="Ex.: Plano Premium 12 meses" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar assinatura"}</Button>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Registrar pagamento</Label>
                  <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Valor recebido" />
                </div>
                <Button onClick={recordPayment} disabled={recordingPayment} variant="default">
                  {recordingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Adicionar</>}
                </Button>
              </div>

              <div>
                <Label className="text-xs">Histórico de pagamentos</Label>
                <div className="mt-2 border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                  {history.length === 0 && <div className="p-3 text-sm text-muted-foreground text-center">Nenhum pagamento registrado</div>}
                  {history.map((p) => (
                    <div key={p.id} className="p-2.5 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-semibold">{fmtMoney(Number(p.amount))}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(p.paid_at), "dd/MM/yyyy")} · {p.method}</div>
                      </div>
                      {p.notes && <div className="text-xs text-muted-foreground truncate max-w-[40%]">{p.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;