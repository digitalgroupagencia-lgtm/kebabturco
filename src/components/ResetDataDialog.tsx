import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  tenantName?: string;
  /** Quando true, esconde opções destrutivas (produtos/categorias/banners) — usado no painel do restaurante */
  restrictDestructive?: boolean;
  onSuccess?: () => void;
}

const ResetDataDialog = ({ open, onOpenChange, tenantId, tenantName, restrictDestructive, onSuccess }: Props) => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState({
    orders: true,
    cash: true,
    stock: false,
    products: false,
    categories: false,
    banners: false,
  });

  const reset = () => {
    setPassword("");
    setOpts({ orders: true, cash: true, stock: false, products: false, categories: false, banners: false });
  };

  const handleConfirm = async () => {
    if (!user?.email) { toast.error("Sessão inválida"); return; }
    if (!password) { toast.error("Digite sua senha para confirmar"); return; }
    const anySelected = Object.values(opts).some(Boolean);
    if (!anySelected) { toast.error("Selecione ao menos uma categoria para apagar"); return; }

    setLoading(true);
    try {
      // Re-autentica para validar a senha
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        toast.error("Senha incorreta");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("reset_tenant_data", {
        _tenant_id: tenantId,
        _reset_orders: opts.orders,
        _reset_cash: opts.cash,
        _reset_stock: opts.stock,
        _reset_products: opts.products,
        _reset_categories: opts.categories,
        _reset_banners: opts.banners,
      });
      if (error) throw error;
      const deleted = ((data as { deleted?: Record<string, number> })?.deleted) || {};
      const parts = [
        deleted.orders ? `${deleted.orders} pedidos` : null,
        deleted.ledger ? `${deleted.ledger} mov. financeiros` : null,
        deleted.print_jobs ? `${deleted.print_jobs} impressões` : null,
        deleted.cash ? `${deleted.cash} caixa` : null,
      ].filter(Boolean);
      toast.success(parts.length ? parts.join(" · ") : "Dados apagados com sucesso");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao zerar dados");
    } finally {
      setLoading(false);
    }
  };

  const Row = ({ k, label, hint }: { k: keyof typeof opts; label: string; hint?: string }) => (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
      <Checkbox checked={opts[k]} onCheckedChange={(v) => setOpts((s) => ({ ...s, [k]: !!v }))} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Zerar dados {tenantName ? `de ${tenantName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Selecione o que deseja apagar. Esta ação é <strong>permanente</strong> e não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
          <Row
            k="orders"
            label="Pedidos, vendas e pagamentos"
            hint="Apaga pedidos, totais, movimentos financeiros, fila de impressão e registos de pagamento online"
          />
          <Row k="cash" label="Histórico de caixa" hint="Aberturas e fechamentos no balcão" />
          <Row k="stock" label="Itens de estoque" hint="Apaga insumos cadastrados" />
          {!restrictDestructive && (
            <>
              <Row k="products" label="Produtos" hint="Apaga produtos, tamanhos e adicionais" />
              <Row k="categories" label="Categorias" hint="Apaga categorias do cardápio" />
              <Row k="banners" label="Banners promocionais" hint="Apaga banners da home" />
            </>
          )}
        </div>

        <Alert variant="destructive" className="bg-destructive/5">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Para confirmar, digite a senha da sua conta abaixo.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reset-pwd">Senha de confirmação</Label>
          <Input
            id="reset-pwd"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || !password}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Apagando...</> : "Confirmar e zerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetDataDialog;