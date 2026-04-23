import { useEffect, useMemo, useState } from "react";
import { usePromoBanners } from "@/hooks/usePromoBanners";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import bannerDefault from "@/assets/elrey/banner-default-1.jpg";
import { Volume2, VolumeX } from "lucide-react";

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

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);

  if (!enabled && banners.length === 0 && !showFallback) return null;
  if (items.length === 0) return null;

  const currentItem = items[index];
  const currentIsVideo = currentItem?.media_type === "video";

  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] w-full rounded-[22px] overflow-hidden shadow-card border border-border/70 bg-secondary/40">
        {items.map((b, i) => {
          const isActive = i === index;
          const isVideo = b.media_type === "video";
          if (isVideo) {
            const ytId = getYoutubeId(b.video_url || "");
            // Sempre autoplay, sem controles, sem botão de pause, sem informações do YouTube.
            // Só o áudio é controlável pelo botão flutuante.
            const mute = muted ? 1 : 0;
            if (ytId) {
              return (
                <iframe
                  key={b.id}
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${mute}&loop=1&playlist=${ytId}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&cc_load_policy=0`}
                  title="Vídeo promocional"
                  className={`absolute inset-0 w-full h-full transition-opacity duration-700 pointer-events-none ${isActive ? "opacity-100" : "opacity-0"}`}
                  allow="autoplay; encrypted-media"
                  frameBorder={0}
                />
              );
            }
            // MP4 nativo
            return (
              <video
                key={b.id}
                src={b.video_url || ""}
                autoPlay
                muted={muted}
                loop
                playsInline
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none ${isActive ? "opacity-100" : "opacity-0"}`}
              />
            );
          }
          return (
            <img
              key={b.id}
              src={b.image_url ?? ""}
              alt="Promoção"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`}
              loading={i === 0 ? "eager" : "lazy"}
            />
          );
        })}
        {/* Camada que bloqueia interação com YouTube/MP4 (sem controles, sem pause). */}
        {currentIsVideo && <div className="absolute inset-0 z-10" aria-hidden />}
        {/* Botão único: ligar/desligar áudio do vídeo atual. */}
        {currentIsVideo && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
            aria-label={muted ? "Activar audio" : "Silenciar"}
            className="absolute z-20 bottom-2 right-2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center active:scale-90 transition-transform border border-white/20"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        {items.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoBannerCarousel;