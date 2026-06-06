import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import { Plus, Trash2, Tag, MoreVertical } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
};

function formatCouponSummary(c: Coupon): string {
  const discount =
    c.discount_type === "percent" ? `${c.discount_value}% desconto` : `${c.discount_value}€ desconto`;
  const min = c.min_order > 0 ? `mín. ${c.min_order}€` : "sem mínimo";
  const uses = c.max_uses ? `${c.uses_count}/${c.max_uses} usos` : `${c.uses_count} usos`;
  return `${discount} · ${min} · ${uses}`;
}

const CouponsPage = () => {
  const { storeId } = useAdminStoreId();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!storeId) return;
    const { data } = await supabase.from("coupons").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const create = async () => {
    if (!storeId || !code.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("coupons").insert({
      store_id: storeId,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order: parseFloat(minOrder) || 0,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cupón criado");
    setCode("");
    setCreateOpen(false);
    load();
  };

  const toggle = async (c: Coupon) => {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover cupón?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Removido");
    load();
  };

  if (!storeId) return <div className="p-6 text-sm text-muted-foreground">Sem loja vinculada</div>;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <HowToUsePanel
        purpose="Crie códigos de desconto para campanhas pontuais (datas, redes sociais, recuperação de cliente)."
        whenToUse="Promoções com duração definida. Para retenção contínua use Fidelidade."
        steps={[
          "Toque em 'Novo cupom' e dê um código curto (ex: WELCOME10).",
          "Escolha tipo (% ou valor fixo) e o valor do desconto.",
          "Defina pedido mínimo e limite de usos (evita prejuízo).",
          "Defina data de expiração.",
          "Ative o cupom e teste no checkout.",
        ]}
        howToConfirm="O cupom aparece na lista com badge 'Ativo' e o cliente vê desconto no carrinho ao digitar o código."
        assistantQuestion="Como crio um cupom eficiente de fim de semana e quais limites evitam prejuízo?"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Cupões
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{coupons.length} cupões · activos no checkout</p>
        </div>
        <Button
          variant={createOpen ? "secondary" : "default"}
          size="sm"
          className="h-10 rounded-xl font-bold shrink-0"
          onClick={() => setCreateOpen((v) => !v)}
        >
          <Plus className="w-4 h-4 mr-1" />
          {createOpen ? "Fechar" : "Novo"}
        </Button>
      </div>

      {createOpen && (
        <div className="rounded-2xl border bg-card p-3.5 space-y-2.5 shadow-sm ring-1 ring-primary/10">
          <div>
            <Label className="text-xs">Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VERAO10"
              className="h-11 mt-1 font-bold tracking-wide"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tipo</Label>
              <select
                className="w-full h-10 mt-1 rounded-md border px-2 text-sm bg-background"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
              >
                <option value="percent">Percentagem</option>
                <option value="fixed">Valor fixo €</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Valor</Label>
              <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="h-10 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Pedido mínimo (€)</Label>
            <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="h-10 mt-1" />
          </div>
          <Button className="w-full h-11 font-bold" onClick={create} disabled={saving}>
            {saving ? "A guardar…" : "Criar cupón"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {coupons.map((c) => (
          <OpsCompactCard
            key={c.id}
            title={c.code}
            summary={formatCouponSummary(c)}
            inactive={!c.is_active}
            badges={c.is_active ? ["Activo"] : ["Pausado"]}
            editable={false}
            actions={
              <>
                <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />
        ))}
        {coupons.length === 0 && !createOpen && (
          <p className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-2xl">
            Nenhum cupón. Toque em Novo para criar.
          </p>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">
        <a href="/admin/diagnostics-hub?tab=coupons" className="text-primary underline">
          Testar validação de cupões no Centro de testes
        </a>
      </p>
    </div>
  );
};

export default CouponsPage;
