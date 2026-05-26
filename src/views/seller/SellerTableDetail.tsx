import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabaseRaw } from "@/integrations/supabase/client";
const supabase = _supabaseRaw as unknown as any;
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Loader2, UserPlus, Receipt, Users } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/hooks/useTenantBilling";
import { nav } from "@/lib/navPaths.ts";

const PAYMENTS = [
  { id: "card", label: "Cartão" },
  { id: "cash", label: "Dinheiro" },
  { id: "pix", label: "Pix" },
];

const SellerTableDetail = () => {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [closingCustomer, setClosingCustomer] = useState<{ id: string; name: string; total: number } | null>(null);
  const [closingTable, setClosingTable] = useState(false);
  const [tableMode, setTableMode] = useState<"unified" | "split">("unified");
  const [unifiedMethod, setUnifiedMethod] = useState("card");
  const [splitMethods, setSplitMethods] = useState<Record<string, string>>({});
  const [newCustomer, setNewCustomer] = useState("");

  const { data: session } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("table_sessions").select("*").eq("id", sessionId).maybeSingle();
      return data;
    },
  });

  const { data: customers, refetch } = useQuery({
    queryKey: ["session-customers", sessionId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_table_session_detail", { _session_id: sessionId });
      return (data ?? []) as any[];
    },
  });

  const refreshAll = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["session", sessionId] });
    qc.invalidateQueries({ queryKey: ["open-tables"] });
  };

  const addCustomer = async () => {
    if (!newCustomer.trim()) return;
    await supabase.rpc("add_or_get_table_customer", { _session_id: sessionId, _name: newCustomer.trim() });
    setNewCustomer("");
    refreshAll();
  };

  const closeCustomer = async (method: string) => {
    if (!closingCustomer) return;
    const { error } = await supabase.rpc("close_table_customer", { _customer_id: closingCustomer.id, _payment_method: method });
    if (error) return toast.error(error.message);
    toast.success(`Cliente ${closingCustomer.name} fechado`);
    setClosingCustomer(null);
    refreshAll();
  };

  const closeTableUnified = async () => {
    const { error } = await supabase.rpc("close_table_session_unified", { _session_id: sessionId, _payment_method: unifiedMethod });
    if (error) return toast.error(error.message);
    toast.success("Mesa fechada");
    setClosingTable(false);
    refreshAll();
    navigate(nav.seller("tables"));
  };

  const closeTableSplit = async () => {
    const active = (customers ?? []).filter((c: any) => c.status === "active");
    for (const c of active) {
      const m = splitMethods[c.customer_id] || "card";
      const { error } = await supabase.rpc("close_table_customer", { _customer_id: c.customer_id, _payment_method: m });
      if (error) { toast.error(`${c.customer_name}: ${error.message}`); return; }
    }
    toast.success("Mesa fechada (pagamentos separados)");
    setClosingTable(false);
    refreshAll();
    navigate(nav.seller("tables"));
  };

  const total = (customers ?? []).reduce((s: number, c: any) => s + Number(c.total_amount || 0), 0);
  const activeCount = (customers ?? []).filter((c: any) => c.status === "active").length;

  if (!session) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="p-3 space-y-3">
      <button onClick={() => navigate(nav.seller("tables"))} className="text-xs flex items-center gap-1 text-muted-foreground"><ArrowLeft className="w-3 h-3" /> Voltar</button>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-black">Mesa {session.table_number}</h1>
          <p className="text-xs text-muted-foreground">{activeCount} cliente(s) ativo(s)</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Total</p>
          <p className="text-xl font-black text-cta">{fmtMoney(total)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {customers?.map((c: any) => (
          <Card key={c.customer_id}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{c.customer_name}</p>
                <p className="text-xs text-muted-foreground">{fmtMoney(Number(c.total_amount || 0))}</p>
              </div>
              {c.status === "active" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate(`${nav.seller("new")}?table=${encodeURIComponent(session.table_number)}&customer=${encodeURIComponent(c.customer_name)}`)}>
                    <Plus className="w-3 h-3 mr-1" /> Item
                  </Button>
                  <Button size="sm" className="bg-cta hover:bg-cta/90 text-white" onClick={() => setClosingCustomer({ id: c.customer_id, name: c.customer_name, total: Number(c.total_amount || 0) })}>
                    <Receipt className="w-3 h-3 mr-1" /> Fechar
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Fechado · {c.payment_method ?? "-"}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold flex items-center gap-1"><UserPlus className="w-3 h-3" /> Adicionar cliente</p>
          <div className="flex gap-2">
            <Input value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="Nome" className="h-9" />
            <Button onClick={addCustomer} className="h-9">Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 font-bold" onClick={() => navigate(`${nav.seller("new")}?table=${encodeURIComponent(session.table_number)}`)}>
          <Plus className="w-4 h-4 mr-1" /> Novo pedido
        </Button>
        <Button className="h-12 font-bold bg-primary text-primary-foreground" onClick={() => setClosingTable(true)} disabled={activeCount === 0}>
          <Users className="w-4 h-4 mr-1" /> Fechar mesa
        </Button>
      </div>

      {/* Dialog: fechar cliente */}
      <Dialog open={!!closingCustomer} onOpenChange={(o) => !o && setClosingCustomer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Fechar {closingCustomer?.name}</DialogTitle></DialogHeader>
          <p className="text-2xl font-black text-cta text-center">{fmtMoney(closingCustomer?.total ?? 0)}</p>
          <p className="text-xs text-muted-foreground text-center">Forma de pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENTS.map((p) => (
              <Button key={p.id} variant="outline" className="h-12 font-bold" onClick={() => closeCustomer(p.id)}>{p.label}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: fechar mesa */}
      <Dialog open={closingTable} onOpenChange={setClosingTable}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Fechar mesa {session.table_number}</DialogTitle></DialogHeader>
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button className={`flex-1 h-9 text-xs font-bold rounded-md ${tableMode === "unified" ? "bg-card shadow" : "text-muted-foreground"}`} onClick={() => setTableMode("unified")}>Pagamento único</button>
            <button className={`flex-1 h-9 text-xs font-bold rounded-md ${tableMode === "split" ? "bg-card shadow" : "text-muted-foreground"}`} onClick={() => setTableMode("split")}>Dividir por cliente</button>
          </div>

          {tableMode === "unified" ? (
            <>
              <p className="text-2xl font-black text-cta text-center">{fmtMoney(total)}</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENTS.map((p) => (
                  <Button key={p.id} variant={unifiedMethod === p.id ? "default" : "outline"} className="h-12 font-bold" onClick={() => setUnifiedMethod(p.id)}>{p.label}</Button>
                ))}
              </div>
              <DialogFooter><Button onClick={closeTableUnified} className="w-full h-11 font-black bg-primary text-primary-foreground">Confirmar fechamento</Button></DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {customers?.filter((c: any) => c.status === "active").map((c: any) => (
                  <div key={c.customer_id} className="border border-border rounded-lg p-2 space-y-1">
                    <div className="flex justify-between text-sm"><span className="font-bold">{c.customer_name}</span><span className="text-cta font-black">{fmtMoney(Number(c.total_amount || 0))}</span></div>
                    <div className="flex gap-1">
                      {PAYMENTS.map((p) => (
                        <button key={p.id} onClick={() => setSplitMethods((m) => ({ ...m, [c.customer_id]: p.id }))} className={`flex-1 h-8 text-[11px] font-bold rounded-md border ${(splitMethods[c.customer_id] || "card") === p.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter><Button onClick={closeTableSplit} className="w-full h-11 font-black bg-primary text-primary-foreground">Confirmar todos</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerTableDetail;