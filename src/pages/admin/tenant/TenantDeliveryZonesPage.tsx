import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck } from "lucide-react";

interface Zone {
  id: string;
  store_id: string;
  name: string;
  min_order: number;
  delivery_fee: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}
interface Store { id: string; name: string }

const TenantDeliveryZonesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant: ctxTenant } = useSelectedTenant();
  const [stores, setStores] = useState<Store[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let tid: string | null = null;
    if (slug) {
      const { data: t } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
      tid = t?.id ?? null;
    } else if (ctxTenant?.id) {
      tid = ctxTenant.id;
    }
    if (!tid) { setLoading(false); return; }
    const { data: s } = await supabase.from("stores").select("id,name").eq("tenant_id", tid).order("sort_order");
    setStores((s as any) || []);
    const first = (s as any)?.[0]?.id ?? "";
    setStoreId((prev) => prev || first);
    setLoading(false);
  };


  const loadZones = async (sid: string) => {
    if (!sid) return;
    const { data } = await supabase.from("delivery_zones").select("*").eq("store_id", sid).order("sort_order");
    setZones((data as any) || []);
  };

  useEffect(() => { load(); }, [slug]);
  useEffect(() => { if (storeId) loadZones(storeId); }, [storeId]);

  const addZone = async () => {
    if (!storeId) return;
    const { data, error } = await supabase.from("delivery_zones").insert({
      store_id: storeId, name: "Nova zona", min_order: 0, delivery_fee: 0, sort_order: zones.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setZones([...zones, data as any]);
  };

  const update = (id: string, patch: Partial<Zone>) =>
    setZones((p) => p.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const save = async (z: Zone) => {
    const { error } = await supabase.from("delivery_zones").update({
      name: z.name, min_order: z.min_order, delivery_fee: z.delivery_fee,
      is_default: z.is_default, is_active: z.is_active,
    }).eq("id", z.id);
    if (error) toast.error(error.message); else toast.success("Salvo");
  };

  const remove = async (id: string) => {
    if (!confirm("Remover zona?")) return;
    await supabase.from("delivery_zones").delete().eq("id", id);
    setZones(zones.filter((z) => z.id !== id));
  };

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Carregando...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" /> Zonas de entrega</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure pedido mínimo e taxa de entrega por unidade. Ex.: Gandia → mín 12€ grátis; Fora de Gandia → mín 12€ + 2€ taxa.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label className="shrink-0">Unidade:</Label>
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={addZone} className="ml-auto"><Plus className="h-4 w-4 mr-1" /> Nova zona</Button>
      </div>

      <div className="space-y-3">
        {zones.map((z) => (
          <Card key={z.id} className="p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Nome</Label>
              <Input value={z.name} onChange={(e) => update(z.id, { name: e.target.value })} />
            </div>
            <div>
              <Label>Mínimo (€)</Label>
              <Input type="number" step="0.5" value={z.min_order} onChange={(e) => update(z.id, { min_order: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Taxa entrega (€)</Label>
              <Input type="number" step="0.5" value={z.delivery_fee} onChange={(e) => update(z.id, { delivery_fee: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={z.is_active} onCheckedChange={(v) => update(z.id, { is_active: v })} /> Ativa
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => remove(z.id)}><Trash2 className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => save(z)}>Salvar</Button>
            </div>
          </Card>
        ))}
        {zones.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma zona ainda. Clique em "Nova zona" para começar.</p>}
      </div>
    </div>
  );
};

export default TenantDeliveryZonesPage;