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
import { Loader2, Plus, Trash2, Truck, MapPin } from "lucide-react";

interface Zone {
  id: string;
  store_id: string;
  name: string;
  min_order: number;
  delivery_fee: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  postal_codes: string[] | null;
  city_names: string[] | null;
  min_distance_km: number | null;
  max_distance_km: number | null;
}

interface Store { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null; geocoded_address: string | null }

const TenantDeliveryZonesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant: ctxTenant } = useSelectedTenant();
  const [stores, setStores] = useState<Store[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  const currentStore = stores.find((s) => s.id === storeId);

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
    const { data: s } = await supabase
      .from("stores")
      .select("id,name,address,latitude,longitude,geocoded_address")
      .eq("tenant_id", tid)
      .order("sort_order");
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

  useEffect(() => { load(); }, [slug, ctxTenant?.id]);
  useEffect(() => { if (storeId) loadZones(storeId); }, [storeId]);

  const geocodeStore = async () => {
    if (!currentStore || !currentStore.address) {
      toast.error("A loja não tem endereço cadastrado. Edite a loja primeiro.");
      return;
    }
    setGeocoding(true);
    const { data, error } = await supabase.functions.invoke("geocode-address", {
      body: { storeId: currentStore.id, address: currentStore.address, mode: "store" },
    });
    setGeocoding(false);
    if (error || !data) { toast.error(error?.message || "Erro ao geocodificar"); return; }
    toast.success(`Loja localizada: ${data.formatted_address}`);
    await load();
  };

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
      postal_codes: z.postal_codes || [],
      city_names: z.city_names || [],
      min_distance_km: z.min_distance_km,
      max_distance_km: z.max_distance_km,
    }).eq("id", z.id);
    if (error) toast.error(error.message); else toast.success("Salvo");
  };

  const parseList = (s: string): string[] =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

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
          Configure faixas de distância em km. Quando o cliente digita o endereço, o sistema calcula automaticamente a distância até a loja via Google Maps e aplica a faixa correta.
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

      {currentStore && (
        <Card className="p-4 bg-secondary/30">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Localização da loja (origem do cálculo)</p>
              <p className="text-xs text-muted-foreground mt-1 break-words">
                Endereço: {currentStore.address || <span className="text-destructive">não cadastrado</span>}
              </p>
              {currentStore.latitude != null ? (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Geocodificado: {currentStore.geocoded_address}<br />
                  ({Number(currentStore.latitude).toFixed(5)}, {Number(currentStore.longitude).toFixed(5)})
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">⚠ Loja ainda não geocodificada — sem isso, o cálculo por km não funciona.</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={geocodeStore} disabled={geocoding || !currentStore.address}>
              {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Localizar"}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {zones.map((z) => (
          <Card key={z.id} className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <Label>Nome</Label>
                <Input value={z.name} onChange={(e) => update(z.id, { name: e.target.value })} placeholder="Ex: Até 3km" />
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
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={z.is_default} onCheckedChange={(v) => update(z.id, { is_default: v })} /> Padrão
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wide text-primary">Distância mínima (km)</Label>
                <Input
                  type="number" step="0.5" min="0"
                  placeholder="0"
                  value={z.min_distance_km ?? ""}
                  onChange={(e) => update(z.id, { min_distance_km: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wide text-primary">Distância máxima (km)</Label>
                <Input
                  type="number" step="0.5" min="0"
                  placeholder="Ex: 3"
                  value={z.max_distance_km ?? ""}
                  onChange={(e) => update(z.id, { max_distance_km: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <p className="md:col-span-2 text-[11px] text-muted-foreground">
                Sistema aplica esta zona automaticamente quando a distância do cliente até a loja estiver entre o mínimo e o máximo.
              </p>
            </div>

            <details className="rounded-lg border border-border">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">Fallback manual (opcional) — cidade ou CEP</summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                <div>
                  <Label className="text-xs">Cidades (separadas por vírgula)</Label>
                  <Input
                    placeholder="Gandia, Grau de Gandia"
                    value={(z.city_names || []).join(", ")}
                    onChange={(e) => update(z.id, { city_names: parseList(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Códigos postais (separados por vírgula)</Label>
                  <Input
                    placeholder="46700, 46701, 46702"
                    value={(z.postal_codes || []).join(", ")}
                    onChange={(e) => update(z.id, { postal_codes: parseList(e.target.value) })}
                  />
                </div>
              </div>
            </details>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => remove(z.id)}><Trash2 className="h-4 w-4 mr-1" /> Remover</Button>
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
