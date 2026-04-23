import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Banner = Tables<"promo_banners">;
type Ops = Tables<"operations_settings">;
const STORE_ID = "b0000000-0000-0000-0000-000000000001";

const BannerPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [ops, setOps] = useState<Ops | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [b, o] = await Promise.all([
      supabase.from("promo_banners").select("*").eq("store_id", STORE_ID).order("sort_order"),
      supabase.from("operations_settings").select("*").eq("store_id", STORE_ID).maybeSingle(),
    ]);
    setBanners(b.data ?? []);
    setOps(o.data ?? null);
  };

  useEffect(() => { load(); }, []);

  const updateOps = async (patch: Partial<Ops>) => {
    if (!ops) return;
    const { error } = await supabase.from("operations_settings").update(patch).eq("store_id", STORE_ID);
    if (error) return toast.error(error.message);
    setOps({ ...ops, ...patch } as Ops);
    toast.success("Guardado");
  };

  const handleUpload = async (file: File) => {
    if (banners.length >= 5) return toast.error("Máximo 5 imágenes");
    const ext = file.name.split(".").pop();
    const path = `${STORE_ID}/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    await supabase.from("promo_banners").insert({
      store_id: STORE_ID, image_url: pub.publicUrl, sort_order: banners.length, is_active: true,
    });
    toast.success("Imagen subida");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("promo_banners").delete().eq("id", id);
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = banners.findIndex((b) => b.id === id);
    const swap = banners[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("promo_banners").update({ sort_order: swap.sort_order }).eq("id", id),
      supabase.from("promo_banners").update({ sort_order: banners[idx].sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  if (!ops) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="h-6 w-6" /> Banner Promocional</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sube hasta 5 imágenes. Recomendado: <strong>1080×600 px</strong> (proporción 16:9), formato JPG ou PNG, máximo 500KB.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Configuración</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Activar banner</Label>
              <p className="text-xs text-muted-foreground">Mostrar el banner en la tela principal del totem</p>
            </div>
            <Switch checked={ops.banner_enabled} onCheckedChange={(v) => updateOps({ banner_enabled: v })} />
          </div>
          <div>
            <Label>Intervalo entre imágenes (segundos)</Label>
            <Input
              type="number"
              value={Math.round((ops.banner_interval_ms ?? 5000) / 1000)}
              onChange={(e) =>
                setOps({ ...ops, banner_interval_ms: Math.max(1, Number(e.target.value)) * 1000 })
              }
              onBlur={(e) =>
                updateOps({ banner_interval_ms: Math.max(1, Number(e.target.value)) * 1000 })
              }
              min={1}
              max={20}
              step={1}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Escribe solo el número de segundos (ej: 3 = cambia cada 3 segundos). Recomendado: 4–6.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Imágenes ({banners.length}/5)</CardTitle>
          <Button onClick={() => fileRef.current?.click()} disabled={banners.length >= 5}>
            <Upload className="w-4 h-4 mr-2" /> Subir imagen
          </Button>
          <input ref={fileRef} type="file" hidden accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </CardHeader>
        <CardContent className="space-y-3">
          {banners.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No hay imágenes. Sube la primera.</p>}
          {banners.map((b, i) => (
            <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20">
              <img src={b.image_url} alt="" className="w-32 h-16 object-cover rounded-xl border" />
              <div className="flex-1 text-xs text-muted-foreground truncate">{b.image_url}</div>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" onClick={() => move(b.id, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => move(b.id, 1)} disabled={i === banners.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="destructive" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BannerPage;