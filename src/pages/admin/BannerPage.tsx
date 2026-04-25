import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2, ArrowUp, ArrowDown, Youtube, Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";

type Banner = Tables<"promo_banners">;
type Ops = Tables<"operations_settings">;

const BannerPage = () => {
  const { storeId: STORE_ID, loading: loadingStore } = useAdminStoreId();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [ops, setOps] = useState<Ops | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoStartMuted, setVideoStartMuted] = useState(true);

  const load = async () => {
    if (!STORE_ID) return;
    const [b, o] = await Promise.all([
      supabase.from("promo_banners").select("*").eq("store_id", STORE_ID).order("sort_order"),
      supabase.from("operations_settings").select("*").eq("store_id", STORE_ID).maybeSingle(),
    ]);
    setBanners(b.data ?? []);
    setOps(o.data ?? null);
  };

  useEffect(() => { if (STORE_ID) load(); }, [STORE_ID]);

  const updateOps = async (patch: Partial<Ops>) => {
    if (!ops || !STORE_ID) return;
    const { error } = await supabase.from("operations_settings").update(patch).eq("store_id", STORE_ID);
    if (error) return toast.error(error.message);
    setOps({ ...ops, ...patch } as Ops);
    toast.success("Guardado");
  };

  const handleUpload = async (file: File) => {
    if (!STORE_ID) return;
    if (banners.length >= 5) return toast.error("Máximo 5 imágenes");
    const ext = file.name.split(".").pop();
    const path = `${STORE_ID}/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
    await supabase.from("promo_banners").insert({
      store_id: STORE_ID, image_url: pub.publicUrl, media_type: "image", sort_order: banners.length, is_active: true,
    } as any);
    toast.success("Imagen subida");
    load();
  };

  const addVideo = async () => {
    if (banners.length >= 5) return toast.error("Máximo 5 elementos");
    const url = videoUrl.trim();
    if (!url) return toast.error("Cole o link do vídeo");
    // Aceita YouTube ou MP4
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const isMp4 = /\.(mp4|webm|mov)(\?|$)/i.test(url);
    if (!isYoutube && !isMp4) {
      return toast.error("Use link do YouTube ou .mp4/.webm");
    }
    const { error } = await supabase.from("promo_banners").insert({
      store_id: STORE_ID,
      media_type: "video",
      video_url: url,
      video_autoplay: true, // sempre autoplay (regra fixa: cliente não pode pausar)
      video_muted: videoStartMuted,
      sort_order: banners.length,
      is_active: true,
    } as any);
    if (error) return toast.error(error.message);
    setVideoUrl("");
    toast.success("Vídeo adicionado");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("promo_banners").delete().eq("id", id);
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = banners.findIndex((b) => b.id === id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= banners.length) return;
    // Reordena o array localmente e regrava sort_order sequencial (0..n) para todos.
    // Evita conflitos quando há sort_order duplicados no banco.
    const reordered = [...banners];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);
    setBanners(reordered.map((b, i) => ({ ...b, sort_order: i })));
    const updates = await Promise.all(
      reordered.map((b, i) =>
        supabase.from("promo_banners").update({ sort_order: i }).eq("id", b.id)
      )
    );
    const err = updates.find((u) => u.error);
    if (err?.error) {
      toast.error(err.error.message);
    }
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
          <CardTitle className="text-lg">Banners ({banners.length}/5)</CardTitle>
          <Button onClick={() => fileRef.current?.click()} disabled={banners.length >= 5}>
            <Upload className="w-4 h-4 mr-2" /> Subir imagen
          </Button>
          <input ref={fileRef} type="file" hidden accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Bloco para adicionar vídeo (YouTube ou MP4) */}
          <div className="p-3 rounded-2xl border-2 border-dashed bg-muted/20 space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Youtube className="w-4 h-4 text-red-600" /> Adicionar vídeo (YouTube ou link .mp4)
            </Label>
            <div className="flex gap-2">
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... ou https://exemplo.com/video.mp4"
                className="flex-1"
              />
              <Button onClick={addVideo} disabled={banners.length >= 5} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={videoStartMuted} onCheckedChange={setVideoStartMuted} />
                Iniciar sem áudio (cliente pode ativar no totem)
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ℹ️ O vídeo sempre toca em loop automaticamente, sem controles e sem possibilidade de pausar (apresentação publicitária). O cliente só pode ligar/desligar o áudio pelo botão do totem.
            </p>
          </div>

          {banners.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum banner. Suba uma imagem ou adicione um vídeo.</p>}
          {banners.map((b, i) => (
            <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20">
              {(b as any).media_type === "video" ? (
                <div className="w-32 h-16 rounded-xl border bg-black flex items-center justify-center text-white text-[10px] font-bold gap-1">
                  <Youtube className="w-4 h-4 text-red-500" /> VÍDEO
                </div>
              ) : (
                <img src={b.image_url ?? ""} alt="" className="w-32 h-16 object-cover rounded-xl border" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">
                  {(b as any).media_type === "video" ? (b as any).video_url : b.image_url}
                </div>
                {(b as any).media_type === "video" && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {(b as any).video_autoplay ? "▶ Autoplay" : "⏸ Manual"} · {(b as any).video_muted ? "🔇 Sem áudio" : "🔊 Com áudio"}
                  </div>
                )}
              </div>
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