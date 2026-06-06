import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Image as ImageIcon, Upload, Trash2, ArrowUp, ArrowDown, Youtube, Plus, Music, Video } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { Loader2 } from "lucide-react";
import { loadOperationsSettingsForStore } from "@/lib/operationsSettingsAdmin";

type Banner = Tables<"promo_banners">;
type Ops = Tables<"operations_settings">;

const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
const MEDIA_ACCEPT = "image/*,video/mp4,video/webm,video/quicktime,.mov,audio/mpeg,audio/mp3,audio/mp4,.mp3,.m4a";

function getBannerMediaType(file: File): "image" | "video" | "audio" | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/") || ["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (file.type.startsWith("audio/") || ["mp3", "m4a", "aac", "wav"].includes(ext)) return "audio";
  return null;
}

const BannerPage = () => {
  const { storeId: STORE_ID, loading: loadingStore } = useAdminStoreId();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [ops, setOps] = useState<Ops | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoStartMuted, setVideoStartMuted] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!STORE_ID) return;
    setLoadingData(true);
    const [b, o] = await Promise.all([
      supabase.from("promo_banners").select("*").eq("store_id", STORE_ID).order("sort_order"),
      loadOperationsSettingsForStore(STORE_ID),
    ]);
    setBanners(b.data ?? []);
    setOps(o);
    setLoadingData(false);
  };

  useEffect(() => {
    if (!STORE_ID) {
      setLoadingData(false);
      return;
    }
    void load();
  }, [STORE_ID]);

  const updateOps = async (patch: Partial<Ops>) => {
    if (!STORE_ID) return;
    let base = ops;
    if (!base) {
      base = await loadOperationsSettingsForStore(STORE_ID);
      if (!base) return toast.error("Não foi possível guardar as definições");
      setOps(base);
    }
    const { error } = await supabase.from("operations_settings").update(patch).eq("store_id", STORE_ID);
    if (error) return toast.error(error.message);
    setOps({ ...base, ...patch } as Ops);
    toast.success("Guardado");
  };

  const handleUpload = async (file: File) => {
    if (!STORE_ID) return;
    if (banners.length >= 5) return toast.error("Máximo 5 elementos");
    const mediaType = getBannerMediaType(file);
    if (!mediaType) return toast.error("Use imagem, MP4, MOV ou MP3");
    if (file.size > MAX_MEDIA_BYTES) return toast.error("Arquivo demasiado grande (máx. 100 MB)");
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || (mediaType === "image" ? "jpg" : mediaType === "audio" ? "mp3" : "mp4")).toLowerCase();
      const safeExt = ext === "jpeg" ? "jpg" : ext;
      const path = `${STORE_ID}/banner-${mediaType}-${Date.now()}.${safeExt}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) return toast.error(error.message);
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: insertError } = await supabase.from("promo_banners").insert({
        store_id: STORE_ID,
        image_url: mediaType === "image" ? publicUrl : null,
        video_url: mediaType === "image" ? null : publicUrl,
        media_type: mediaType,
        video_autoplay: mediaType !== "image",
        video_muted: mediaType === "video" ? videoStartMuted : false,
        sort_order: banners.length,
        is_active: true,
      } as any);
      if (insertError) return toast.error(insertError.message);
      toast.success(mediaType === "image" ? "Imagem subida" : mediaType === "audio" ? "Áudio subido" : "Vídeo subido");
      load();
    } finally {
      setUploading(false);
    }
  };

  const addVideo = async () => {
    if (banners.length >= 5) return toast.error("Máximo 5 elementos");
    const url = videoUrl.trim();
    if (!url) return toast.error("Cole o link do vídeo");
    // Aceita YouTube, MP4/MOV/WebM ou MP3/M4A por URL
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
    const isAudio = /\.(mp3|m4a|aac|wav)(\?|$)/i.test(url);
    if (!isYoutube && !isVideo && !isAudio) {
      return toast.error("Use link do YouTube, MP4, MOV ou MP3");
    }
    const { error } = await supabase.from("promo_banners").insert({
      store_id: STORE_ID,
      media_type: isAudio ? "audio" : "video",
      video_url: url,
      video_autoplay: true, // sempre autoplay (regra fixa: cliente não pode pausar)
      video_muted: isAudio ? false : videoStartMuted,
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

  if (loadingStore || loadingData) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  if (!STORE_ID) {
    return (
      <div className="p-8 text-muted-foreground">
        Nenhuma unidade activa encontrada. Verifique Administração → Unidades.
      </div>
    );
  }

  const bannerEnabled = ops?.banner_enabled ?? true;
  const bannerIntervalMs = ops?.banner_interval_ms ?? 5000;

  return (
    <div className="space-y-6 max-w-5xl">
      <HowToUsePanel
        purpose="Banners de imagem, vídeo ou áudio que aparecem no PWA e totem."
        whenToUse="Lançamento, promoção, anúncio sazonal."
        steps={[
          "Clique 'Adicionar banner'.",
          "Suba imagem (JPG/PNG), vídeo (MP4/MOV/WEBM) ou áudio (MP3). Limite 100 MB.",
          "Use as setas ↑/↓ para reordenar.",
          "Ative o switch — o banner aparece imediatamente no cliente.",
        ]}
        howToConfirm="Abra a loja em outra aba — o banner aparece no topo do cardápio."
        assistantQuestion="Qual formato e duração de banner converte melhor no totem?"
      />
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="h-6 w-6" /> Banner Promocional</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Suba até 5 elementos: imagens, vídeos MP4/MOV ou áudio MP3. Imagens seguem o intervalo; vídeos e áudios tocam pela própria duração.
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
            <Switch checked={bannerEnabled} onCheckedChange={(v) => updateOps({ banner_enabled: v })} />
          </div>
          <div>
            <Label>Intervalo entre imágenes (segundos)</Label>
            <Input
              type="number"
              value={Math.round(bannerIntervalMs / 1000)}
              onChange={(e) => {
                const ms = Math.max(1, Number(e.target.value)) * 1000;
                if (ops) setOps({ ...ops, banner_interval_ms: ms });
              }}
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
          <Button onClick={() => fileRef.current?.click()} disabled={banners.length >= 5 || uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Subir mídia
          </Button>
          <input ref={fileRef} type="file" hidden accept={MEDIA_ACCEPT}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Bloco para adicionar vídeo (YouTube ou MP4) */}
          <div className="p-3 rounded-2xl border-2 border-dashed bg-muted/20 space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Youtube className="w-4 h-4 text-primary" /> Adicionar por link (YouTube, MP4, MOV ou MP3)
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
              ℹ️ Para upload direto, use o botão “Subir mídia”. O tempo do intervalo vale só para imagens; vídeo/áudio passam para o próximo item quando terminam.
            </p>
          </div>

          {banners.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum banner. Suba uma imagem, vídeo/áudio ou adicione um link.</p>}
          {banners.map((b, i) => (
            <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20">
              {(b as any).media_type === "video" ? (
                <div className="w-32 h-16 rounded-xl border bg-foreground text-background flex items-center justify-center text-[10px] font-bold gap-1 shrink-0">
                  <Video className="w-4 h-4" /> VÍDEO
                </div>
              ) : (b as any).media_type === "audio" ? (
                <div className="w-32 h-16 rounded-xl border bg-foreground text-background flex items-center justify-center text-[10px] font-bold gap-1 shrink-0">
                  <Music className="w-4 h-4" /> ÁUDIO
                </div>
              ) : (
                <img src={b.image_url ?? ""} alt="" className="w-32 h-16 object-cover rounded-xl border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">
                  {(b as any).media_type === "video" || (b as any).media_type === "audio" ? (b as any).video_url : b.image_url}
                </div>
                {((b as any).media_type === "video" || (b as any).media_type === "audio") && (
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