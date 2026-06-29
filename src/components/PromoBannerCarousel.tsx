import { useEffect, useMemo, useState } from "react";
import { usePromoBanners } from "@/hooks/usePromoBanners";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import bannerDefault from "@/assets/elrey/banner-default-1.jpg";
import { Music, Volume2, VolumeX } from "lucide-react";

/**
 * Extrai o ID de um link do YouTube (várias formas suportadas).
 */
function getYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch { return null; }
}

const PromoBannerCarousel = () => {
  const { banners } = usePromoBanners();
  const { settings } = useOperationsSettings();
  const [index, setIndex] = useState(0);
  // Controle global de mute para vídeos (cliente pode ligar/desligar áudio)
  const [muted, setMuted] = useState(true);

  const enabled = settings?.banner_enabled ?? false;
  const interval = settings?.banner_interval_ms ?? 5000;

  // Fallback: se admin não desativou explicitamente, mostra banner default quando não há nenhum cadastrado
  const showFallback = !enabled && banners.length === 0;
  const items = useMemo(() => {
    if (banners.length > 0) return banners;
    if (showFallback) return [{ id: "fallback", image_url: bannerDefault, media_type: "image" } as any];
    return [] as any[];
  }, [banners, showFallback]);
  const goNext = () => setIndex((i) => (i + 1) % Math.max(items.length, 1));

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const current = items[index];
    const mediaType = current?.media_type ?? "image";
    if (mediaType !== "image") return;
    const t = window.setTimeout(goNext, interval);
    return () => window.clearTimeout(t);
  }, [items, index, interval]);

  const currentItem = items[index];
  const currentMediaType = currentItem?.media_type ?? "image";
  const currentIsVideo = currentMediaType === "video";
  const currentIsAudio = currentMediaType === "audio";
  const ytId = currentIsVideo ? getYoutubeId(currentItem?.video_url || "") : null;

  useEffect(() => {
    if (currentIsVideo || currentIsAudio) {
      setMuted(currentItem?.video_muted ?? currentIsVideo);
    }
  }, [currentItem?.id, currentItem?.video_muted, currentIsAudio, currentIsVideo]);

  if (!enabled && banners.length === 0 && !showFallback) return null;
  if (items.length === 0 || !currentItem) return null;

  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] border border-border/70 bg-primary shadow-card">
        {currentIsVideo && ytId ? (
          <iframe
            key={currentItem.id}
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&cc_load_policy=0`}
            title="Vídeo promocional"
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
            frameBorder={0}
          />
        ) : currentIsVideo ? (
          <video
            key={currentItem.id}
            src={currentItem.video_url || ""}
            autoPlay
            muted={muted}
            playsInline
            onEnded={items.length > 1 ? goNext : undefined}
            onError={items.length > 1 ? goNext : undefined}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ) : currentIsAudio ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary text-secondary-foreground">
            <Music className="w-12 h-12" />
            <span className="text-sm font-semibold">Áudio promocional</span>
            <audio
              key={currentItem.id}
              src={currentItem.video_url || ""}
              autoPlay
              muted={muted}
              onEnded={items.length > 1 ? goNext : undefined}
              onError={items.length > 1 ? goNext : undefined}
            />
          </div>
        ) : (
          <img
            key={currentItem.id}
            src={currentItem.image_url ?? ""}
            alt="Promoção"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading={index === 0 ? "eager" : "lazy"}
          />
        )}
        {/* Camada que bloqueia interação com YouTube/MP4/áudio (sem controles, sem pause). */}
        {(currentIsVideo || currentIsAudio) && <div className="absolute inset-0 z-10" aria-hidden />}
        {/* Botão único: ligar/desligar áudio da mídia atual. */}
        {(currentIsVideo || currentIsAudio) && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
            aria-label={muted ? "Activar audio" : "Silenciar"}
            className="absolute z-20 bottom-2 right-2 w-9 h-9 rounded-full bg-background/70 backdrop-blur-sm text-foreground flex items-center justify-center active:scale-90 transition-transform border border-border"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        {items.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-background" : "w-1.5 bg-background/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoBannerCarousel;