import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { formatDeliveryZoneSummary } from "@/lib/formatDeliveryZoneSummary";
import { ensureStoreCoordsFromAddress } from "@/services/storeGeocodeService";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck, Copy, Download, MoreVertical } from "lucide-react";

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

interface Store {
  id: string;
  name: string;
  address: string | null;
}

function ZoneEditor({
  zone,
  onChange,
  onSave,
  saving,
}: {
  zone: Zone;
  onChange: (patch: Partial<Zone>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const parseList = (s: string): string[] =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <Label className="text-xs">Nome</Label>
          <Input
            value={zone.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-10"
          />
        </div>
        <div>
          <Label className="text-xs">Mínimo (€)</Label>
          <Input
            type="number"
            step="0.5"
            value={zone.min_order}
            onChange={(e) => onChange({ min_order: Number(e.target.value) })}
            className="h-10"
          />
        </div>
        <div>
          <Label className="text-xs">Taxa (€)</Label>
          <Input
            type="number"
            step="0.5"
            value={zone.delivery_fee}
            onChange={(e) => onChange({ delivery_fee: Number(e.target.value) })}
            className="h-10"
          />
        </div>
      </div>

      <div className="flex gap-4 py-1">
        <label className="flex items-center gap-2 text-xs font-medium">
          <Switch checked={zone.is_active} onCheckedChange={(v) => onChange({ is_active: v })} />
          Activa
        </label>
        <label className="flex items-center gap-2 text-xs font-medium">
          <Switch checked={zone.is_default} onCheckedChange={(v) => onChange({ is_default: v })} />
          Fallback
        </label>
      </div>

      <div className="space-y-2 rounded-xl bg-secondary/40 p-3 border border-border/60">
        <div>
          <Label className="text-xs">Códigos postais</Label>
          <Input
            placeholder="46700, 46701…"
            value={(zone.postal_codes || []).join(", ")}
            onChange={(e) => onChange({ postal_codes: parseList(e.target.value) })}
            className="h-10 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Cidades</Label>
          <Input
            placeholder="Gandia, Grau de Gandia…"
            value={(zone.city_names || []).join(", ")}
            onChange={(e) => onChange({ city_names: parseList(e.target.value) })}
            className="h-10 mt-1"
          />
        </div>
      </div>

      <details className="rounded-xl border border-border/60 text-xs">
        <summary className="cursor-pointer px-3 py-2.5 font-medium text-muted-foreground">
          Avançado, distância (km)
        </summary>
        <div className="grid grid-cols-2 gap-2 p-3 pt-0">
          <div>
            <Label className="text-[10px]">Mín. km</Label>
            <Input
              type="number"
              step="0.5"
              placeholder=", "
              value={zone.min_distance_km ?? ""}
              onChange={(e) =>
                onChange({ min_distance_km: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="h-9 mt-0.5"
            />
          </div>
          <div>
            <Label className="text-[10px]">Máx. km</Label>
            <Input
              type="number"
              step="0.5"
              placeholder=", "
              value={zone.max_distance_km ?? ""}
              onChange={(e) =>
                onChange({ max_distance_km: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="h-9 mt-0.5"
            />
          </div>
        </div>
      </details>

      <Button type="button" className="w-full h-11 font-bold" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar zona"}
      </Button>
    </>
  );
}

const TenantDeliveryZonesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant: ctxTenant } = useSelectedTenant();
  const [stores, setStores] = useState<Store[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
    if (!tid) {
      setLoading(false);
      return;
    }
    const { data: s } = await supabase
      .from("stores")
      .select("id,name,address")
      .eq("tenant_id", tid)
      .order("sort_order");
    setStores((s as Store[]) || []);
    const first = (s as Store[])?.[0]?.id ?? "";
    setStoreId((prev) => prev || first);
    setLoading(false);
  };

  const loadZones = async (sid: string) => {
    if (!sid) return;
    const { data } = await supabase.from("delivery_zones").select("*").eq("store_id", sid).order("sort_order");
    setZones((data as Zone[]) || []);
    setEditingId(null);
  };

  useEffect(() => {
    load();
  }, [slug, ctxTenant?.id]);

  useEffect(() => {
    if (storeId) loadZones(storeId);
  }, [storeId]);

  const update = (id: string, patch: Partial<Zone>) =>
    setZones((p) => p.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const save = async (z: Zone) => {
    setSavingId(z.id);
    const { error } = await supabase
      .from("delivery_zones")
      .update({
        name: z.name,
        min_order: z.min_order,
        delivery_fee: z.delivery_fee,
        is_default: z.is_default,
        is_active: z.is_active,
        postal_codes: z.postal_codes || [],
        city_names: z.city_names || [],
        min_distance_km: z.min_distance_km,
        max_distance_km: z.max_distance_km,
      })
      .eq("id", z.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    void ensureStoreCoordsFromAddress(z.store_id);
    toast.success("Zona guardada");
    setEditingId(null);
  };

  const addZone = async () => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("delivery_zones")
      .insert({
        store_id: storeId,
        name: "Nova zona",
        min_order: 0,
        delivery_fee: 0,
        sort_order: zones.length,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = data as Zone;
    setZones([...zones, row]);
    setEditingId(row.id);
  };

  const duplicateZone = async (z: Zone) => {
    if (!storeId) return;
    const { data, error } = await supabase
      .from("delivery_zones")
      .insert({
        store_id: storeId,
        name: `${z.name} (cópia)`,
        min_order: z.min_order,
        delivery_fee: z.delivery_fee,
        postal_codes: z.postal_codes || [],
        city_names: z.city_names || [],
        min_distance_km: z.min_distance_km,
        max_distance_km: z.max_distance_km,
        is_default: false,
        is_active: z.is_active,
        sort_order: zones.length,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = data as Zone;
    setZones([...zones, row]);
    setEditingId(row.id);
    toast.success("Zona duplicada, edite e guarde");
  };

  const remove = async (id: string) => {
    if (!confirm("Remover zona?")) return;
    await supabase.from("delivery_zones").delete().eq("id", id);
    setZones(zones.filter((z) => z.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const importPreset = async () => {
    if (!storeId) return;
    if (!confirm("Substituir zonas actuais pela plantilla do tenant?")) return;
    setImporting(true);
    const { data, error } = await (supabase.rpc as any)("import_operational_preset", {
      _store_id: storeId,
      _replace_existing: true,
    });
    setImporting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { skipped?: boolean; zones_inserted?: number };
    toast.success(result?.skipped ? "Zonas já existiam" : `Plantilla aplicada (${result?.zones_inserted ?? 0})`);
    await loadZones(storeId);
    void ensureStoreCoordsFromAddress(storeId);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> A carregar…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Zonas de entrega
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Código postal → cidade → fallback. Toque em Editar para alterar.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Unidade</Label>
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs" onClick={importPreset} disabled={importing}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Plantilla
        </Button>
        <Button className="flex-1 h-10 rounded-xl text-xs font-bold" onClick={addZone}>
          <Plus className="h-4 w-4 mr-1" /> Nova zona
        </Button>
      </div>

      {currentStore?.address && (
        <p className="text-xs text-muted-foreground rounded-xl border bg-card px-3.5 py-3">
          Morada da unidade: <span className="text-foreground font-medium">{currentStore.address}</span>
        </p>
      )}

      <div className="space-y-2.5">
        {zones.map((z) => {
          const badges: string[] = [];
          if (z.is_default) badges.push("Fallback");
          if (!z.is_active) badges.push("Inactiva");
          const cpCount = (z.postal_codes || []).length;
          const cityCount = (z.city_names || []).length;
          const meta =
            cpCount || cityCount
              ? `${cpCount} CP · ${cityCount} cidades`
              : undefined;

          return (
            <OpsCompactCard
              key={z.id}
              title={z.name}
              summary={formatDeliveryZoneSummary(z)}
              meta={meta}
              badges={badges}
              inactive={!z.is_active}
              isEditing={editingId === z.id}
              onEdit={() => setEditingId(z.id)}
              onCancel={() => setEditingId(null)}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicateZone(z)}>
                      <Copy className="h-4 w-4 mr-2" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(z.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              <ZoneEditor
                zone={z}
                onChange={(patch) => update(z.id, patch)}
                onSave={() => save(z)}
                saving={savingId === z.id}
              />
            </OpsCompactCard>
          );
        })}
        {zones.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-2xl">
            Nenhuma zona. Use Plantilla ou Nova zona.
          </p>
        )}
      </div>
    </div>
  );
};

export default TenantDeliveryZonesPage;
