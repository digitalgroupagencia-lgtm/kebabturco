import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";

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

const CouponsPage = () => {
  const { storeId } = useAdminStoreId();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");

  const load = async () => {
    if (!storeId) return;
    const { data } = await supabase.from("coupons").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) || []);
  };

  useEffect(() => { load(); }, [storeId]);

  const create = async () => {
    if (!storeId || !code.trim()) return;
    const { error } = await supabase.from("coupons").insert({
      store_id: storeId,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order: parseFloat(minOrder) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Cupón criado");
      setCode("");
      load();
    }
  };

  const toggle = async (c: Coupon) => {
    await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Removido");
    load();
  };

  if (!storeId) return <div className="p-8 text-muted-foreground">Sem loja vinculada</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6" /> Cupões</h2>

      <Card>
        <CardHeader><CardTitle>Novo cupón</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Código</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VERAO10" /></div>
          <div>
            <Label>Tipo</Label>
            <select className="w-full h-10 rounded-md border px-3" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}>
              <option value="percent">Percentagem (%)</option>
              <option value="fixed">Valor fixo (€)</option>
            </select>
          </div>
          <div><Label>Valor</Label><Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} /></div>
          <div><Label>Pedido mínimo (€)</Label><Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} /></div>
          <Button onClick={create} className="md:col-span-2"><Plus className="w-4 h-4 mr-1" /> Criar cupón</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {coupons.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-black text-lg">{c.code}</p>
                <p className="text-sm text-muted-foreground">
                  {c.discount_type === "percent" ? `${c.discount_value}%` : `€${c.discount_value}`} off · min €{c.min_order} · usos {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                <Button variant="destructive" size="icon" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CouponsPage;
