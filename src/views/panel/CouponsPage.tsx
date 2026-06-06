import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Gift, Tag, TrendingUp, Wallet } from "lucide-react";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumTable } from "@/components/premium/PremiumTable";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { PremiumStatusBadge } from "@/components/premium/PremiumStatusBadge";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";

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

type CouponRow = {
  code: string;
  type: string;
  value: string;
  validity: string;
  usage: string;
  limit: string;
  revenue: string;
  status: string;
};

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

  const activeCoupons = coupons.filter((c) => c.is_active);
  const totalUsage = coupons.reduce((sum, c) => sum + (c.uses_count || 0), 0);
  const estimatedRevenue = coupons.reduce((sum, c) => sum + (c.uses_count || 0) * 12.5, 0);
  const estimatedDiscount = coupons.reduce((sum, c) => {
    if (c.discount_type === "percent") return sum + c.uses_count * (c.discount_value * 0.15);
    return sum + c.uses_count * c.discount_value;
  }, 0);
  const conversion = coupons.length ? ((activeCoupons.length / coupons.length) * 100).toFixed(1) : "0.0";

  const tableRows: CouponRow[] = coupons.map((c) => ({
    code: c.code,
    type: c.discount_type === "percent" ? "Percentagem" : "Valor fixo",
    value: c.discount_type === "percent" ? `${c.discount_value}%` : `€ ${c.discount_value.toFixed(2)}`,
    validity: c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-PT") : "Sem validade",
    usage: `${c.uses_count}`,
    limit: c.max_uses ? `${c.max_uses}` : "Ilimitado",
    revenue: `€ ${(c.uses_count * 12.5).toFixed(2)}`,
    status: c.is_active ? "Ativo" : "Pausado",
  }));

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title="Cupons"
        subtitle="Gestão de campanhas e conversão de pedidos"
        actions={
          <PremiumActionButton tone="primary" onClick={() => setCreateOpen((v) => !v)}>
            {createOpen ? "Fechar" : "Novo cupom"}
          </PremiumActionButton>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <PremiumMetricCard title="Cupons ativos" value={activeCoupons.length} subtitle="em funcionamento" icon={Tag} color="brand" />
        <PremiumMetricCard title="Usos hoje" value={totalUsage} subtitle="resgates acumulados" icon={Gift} color="purple" />
        <PremiumMetricCard title="Receita gerada" value={`€ ${estimatedRevenue.toFixed(2)}`} subtitle="estimativa atual" icon={TrendingUp} color="green" />
        <PremiumMetricCard title="Desconto concedido" value={`€ ${estimatedDiscount.toFixed(2)}`} subtitle="impacto promocional" icon={Wallet} color="orange" />
        <PremiumMetricCard title="Conversão" value={`${conversion}%`} subtitle="ativos vs total" icon={Copy} color="blue" />
      </section>

      {createOpen && (
        <PremiumCard title="Criar cupom" subtitle="Defina tipo, valor e condição mínima" className="bg-[#111111]">
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
        </PremiumCard>
      )}

      <PremiumTable
        title="Tabela de cupons"
        subtitle="Acompanhe uso e estado em tempo real"
        rows={tableRows}
        columns={[
          { key: "code", label: "Código", render: (row) => <span className="font-bold">{row.code}</span> },
          { key: "type", label: "Tipo", render: (row) => row.type },
          { key: "value", label: "Valor", render: (row) => row.value },
          { key: "validity", label: "Validade", render: (row) => row.validity },
          { key: "usage", label: "Uso", render: (row) => row.usage },
          { key: "limit", label: "Limite", render: (row) => row.limit },
          { key: "revenue", label: "Receita", render: (row) => row.revenue },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <PremiumStatusBadge status={row.status === "Ativo" ? "success" : "neutral"}>
                {row.status}
              </PremiumStatusBadge>
            ),
          },
        ]}
        empty={
          <PremiumEmptyState
            icon={Tag}
            title="Você ainda não tem cupons ativos"
            description="Crie o primeiro cupom para incentivar novas compras."
            actionLabel="Criar primeiro cupom"
            onAction={() => setCreateOpen(true)}
          />
        }
      />

      <PremiumCard title="Ações rápidas" className="bg-[#111111]">
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <p className="font-bold">{c.code}</p>
                <p className="text-xs text-zinc-500">{formatCouponSummary(c)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                <PremiumActionButton tone="ghost" className="h-9 px-3" onClick={() => remove(c.id)}>
                  Remover
                </PremiumActionButton>
              </div>
            </div>
          ))}
        </div>
      </PremiumCard>
    </div>
  );
};

export default CouponsPage;
