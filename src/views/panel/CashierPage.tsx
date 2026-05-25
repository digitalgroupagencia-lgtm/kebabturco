import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Clock, CreditCard, Banknote, Smartphone } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type CashRegister = Tables<"cash_registers">;

const CashierPage = () => {
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const storeId = roleData?.store_id;

  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialogVisible, setOpenDialogVisible] = useState(false);
  const [closeDialogVisible, setCloseDialogVisible] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [todaySales, setTodaySales] = useState({ total: 0, card: 0, cash: 0, pix: 0, count: 0 });

  useEffect(() => {
    if (storeId) {
      fetchCurrentRegister();
      fetchTodaySales();
    }
  }, [storeId]);

  const fetchCurrentRegister = async () => {
    if (!storeId) return;
    const { data } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("store_id", storeId)
      .is("closed_at", null)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setCurrentRegister(data);
    setLoading(false);
  };

  const fetchTodaySales = async () => {
    if (!storeId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("orders")
      .select("total, payment_method")
      .eq("store_id", storeId)
      .neq("status", "cancelled")
      .gte("created_at", today.toISOString());

    if (data) {
      const total = data.reduce((s, o) => s + Number(o.total), 0);
      const card = data.filter((o) => o.payment_method === "card").reduce((s, o) => s + Number(o.total), 0);
      const cash = data.filter((o) => o.payment_method === "cash").reduce((s, o) => s + Number(o.total), 0);
      const pix = data.filter((o) => o.payment_method === "pix").reduce((s, o) => s + Number(o.total), 0);
      setTodaySales({ total, card, cash, pix, count: data.length });
    }
  };

  const openRegister = async () => {
    if (!storeId || !user) return;
    const { error } = await supabase.from("cash_registers").insert({
      store_id: storeId,
      opened_by: user.id,
      opening_balance: parseFloat(openingBalance) || 0,
    });

    if (error) {
      toast.error("Erro ao abrir caixa");
    } else {
      toast.success("Caixa aberto!");
      setOpenDialogVisible(false);
      fetchCurrentRegister();
    }
  };

  const closeRegister = async () => {
    if (!currentRegister || !user) return;
    const { error } = await supabase
      .from("cash_registers")
      .update({
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closing_balance: parseFloat(closingBalance) || 0,
        total_sales: todaySales.total,
      })
      .eq("id", currentRegister.id);

    if (error) {
      toast.error("Erro ao fechar caixa");
    } else {
      toast.success("Caixa fechado!");
      setCloseDialogVisible(false);
      fetchCurrentRegister();
    }
  };

  if (!storeId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Caixa</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma loja vinculada.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Caixa
        </h2>
        {!currentRegister ? (
          <Button onClick={() => setOpenDialogVisible(true)} className="bg-success hover:bg-success/90">
            <ArrowUpCircle className="h-4 w-4 mr-1" /> Abrir Caixa
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => setCloseDialogVisible(true)}>
            <ArrowDownCircle className="h-4 w-4 mr-1" /> Fechar Caixa
          </Button>
        )}
      </div>

      {/* Status */}
      <Card className={currentRegister ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${currentRegister ? "bg-success animate-pulse" : "bg-destructive"}`} />
          <span className="font-semibold">
            {currentRegister ? "Caixa Aberto" : "Caixa Fechado"}
          </span>
          {currentRegister && (
            <span className="text-sm text-muted-foreground ml-auto">
              <Clock className="inline h-3 w-3 mr-1" />
              Aberto às {new Date(currentRegister.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Sales summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">€ {todaySales.total.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{todaySales.count} pedidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Cartão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€ {todaySales.card.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Banknote className="h-4 w-4" /> Dinheiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€ {todaySales.cash.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Smartphone className="h-4 w-4" /> Pix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">€ {todaySales.pix.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {currentRegister && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo do Turno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo Inicial</span>
              <span className="font-semibold">€ {Number(currentRegister.opening_balance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendas (Dinheiro)</span>
              <span className="font-semibold text-success">+ € {todaySales.cash.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Saldo Esperado</span>
              <span className="font-bold text-lg">€ {(Number(currentRegister.opening_balance) + todaySales.cash).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Dialog */}
      <Dialog open={openDialogVisible} onOpenChange={setOpenDialogVisible}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <div>
            <Label>Saldo Inicial (€)</Label>
            <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={openRegister}>Abrir Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeDialogVisible} onOpenChange={setCloseDialogVisible}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          <div>
            <Label>Saldo Final Contado (€)</Label>
            <Input type="number" step="0.01" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" />
          </div>
          <p className="text-sm text-muted-foreground">
            Total vendido hoje: <strong>€ {todaySales.total.toFixed(2)}</strong>
          </p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={closeRegister}>Fechar Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashierPage;
