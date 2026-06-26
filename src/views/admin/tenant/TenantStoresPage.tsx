import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { provisionStripeConnect } from "@/services/orderService";
import { geocodeAndUpdateStoreCoords } from "@/services/storeGeocodeService";
import { Loader2, Plus, Trash2, Store as StoreIcon, Upload } from "lucide-react";

interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  image_url: string | null;
  short_description: string | null;
  is_active: boolean;
  sort_order: number;
  flow_store_id: string | null;
}

const TenantStoresPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tenant: ctxTenant, loading: tenantLoading } = useSelectedTenant();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let tid: string | null = null;
    if (slug) {
      const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
      tid = tenant?.id ?? null;
    } else if (ctxTenant?.id) {
      tid = ctxTenant.id;
    }
    if (!tid) { setLoading(false); return; }
    setTenantId(tid);
    const { data } = await supabase
      .from("stores").select("*").eq("tenant_id", tid)
      .order("sort_order").order("created_at");
    setStores((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug, ctxTenant?.id]);


  const addStore = async () => {
    if (!tenantId) {
      toast.error("Não foi possível identificar o cliente. Recarregue a página ou volte a entrar.");
      return;
    }
    const { data, error } = await supabase.from("stores").insert({
      tenant_id: tenantId, name: "Nova unidade", is_active: true, sort_order: stores.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    try {
      await provisionStripeConnect((data as Store).id);
    } catch {
      // Conta financeira pode ser activada depois em Recebimentos
    }
    setStores([...stores, data as any]);
    toast.success("Unidade criada");
  };

  const updateStore = async (id: string, patch: Partial<Store>) => {
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const saveStore = async (s: Store) => {
    setSaving(s.id);
    const { error } = await supabase.from("stores").update({
      name: s.name, address: s.address, phone: s.phone, image_url: s.image_url,
      short_description: s.short_description, is_active: s.is_active, sort_order: s.sort_order,
      flow_store_id: s.flow_store_id?.trim() || null,
    }).eq("id", s.id);
    if (error) {
      setSaving(null);
      toast.error(error.message);
      return;
    }
    if (s.address?.trim()) {
      const geo = await geocodeAndUpdateStoreCoords(s.id, { address: s.address, storeName: s.name });
      if (geo.ok) {
        toast.success("Salvo — posição do restaurante actualizada para entregas");
      } else {
        toast.success("Salvo — confirme o endereço completo para calcular a posição automaticamente");
      }
    } else {
      toast.success("Salvo");
    }
    setSaving(null);
  };

  const removeStore = async (id: string) => {
    if (stores.length <= 1) {
      toast.error("É necessário pelo menos uma unidade");
      return;
    }
    if (!confirm("Remover esta unidade? Pedidos antigos serão preservados.")) return;
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setStores(stores.filter((s) => s.id !== id));
    toast.success("Unidade removida");
  };

  const uploadImage = async (storeId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `stores/${storeId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    updateStore(storeId, { image_url: pub.publicUrl });
    await supabase.from("stores").update({ image_url: pub.publicUrl }).eq("id", storeId);
    toast.success("Imagem atualizada");
  };

  if (loading || (tenantLoading && !tenantId)) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin h-4 w-4" /> Carregando unidades…
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="p-8 max-w-lg space-y-2">
        <p className="font-bold text-foreground">Não foi possível carregar o cliente Kebab Turco.</p>
        <p className="text-sm text-muted-foreground">
          Saia e entre novamente. Se o problema continuar, confirme que a sua conta tem acesso ao tenant Kebab Turco.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><StoreIcon className="h-6 w-6" /> Unidades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre as unidades deste cliente. Se houver 2 ou mais unidades ativas, o totem mostra uma tela para o cliente escolher antes do tipo de pedido. Cada unidade tem sua própria impressora.
          </p>
        </div>
        <Button onClick={addStore}><Plus className="h-4 w-4 mr-1" /> Nova unidade</Button>
      </div>

      <div className="space-y-4">
        {stores.map((s) => (
          <Card key={s.id} className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/50 transition">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
                      <Upload className="h-5 w-5" /> Ícone
                    </div>
                  )}
                  <input
                    type="file" accept="image/png,image/webp,image/svg+xml" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(s.id, f); }}
                  />
                </label>
                <p className="text-[10px] text-muted-foreground text-center leading-tight max-w-[96px]">
                  PNG/SVG quadrado<br />512×512px · fundo transparente
                </p>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome da unidade</Label>
                  <Input value={s.name} onChange={(e) => updateStore(s.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={s.phone || ""} onChange={(e) => updateStore(s.id, { phone: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={s.address || ""} onChange={(e) => updateStore(s.id, { address: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição curta (aparece no totem)</Label>
                  <Textarea
                    rows={2}
                    value={s.short_description || ""}
                    onChange={(e) => updateStore(s.id, { short_description: e.target.value })}
                    placeholder="Ex.: Centro da cidade · Aberto até 23h"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>ID da loja no PDV WGM</Label>
                  <Input
                    value={s.flow_store_id || ""}
                    onChange={(e) => updateStore(s.id, { flow_store_id: e.target.value || null })}
                    placeholder="UUID da unidade no sistema WGM (copiar do PDV)"
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Liga esta unidade ao PDV. Sem este ID os pedidos não aparecem no backoffice WGM.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={s.is_active} onCheckedChange={(v) => updateStore(s.id, { is_active: v })} />
                Ativa
              </label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => removeStore(s.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
                <Button onClick={() => saveStore(s)} disabled={saving === s.id}>
                  {saving === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TenantStoresPage;