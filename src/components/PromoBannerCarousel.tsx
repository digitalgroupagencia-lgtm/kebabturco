import { useCallback, useEffect, useRef, useState } from "react";
import { usePromoBanners } from "@/hooks/usePromoBanners";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import { menuImageUrl, preloadPromoBannerMedia } from "@/lib/menuImageUrl";
import { cn } from "@/lib/utils";
import { Music, Volume2, VolumeX } from "lucide-react";
import { Capacitor } from "@capacitor/core";

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

const BANNER_IMAGE_WIDTH = 820;

const PromoBannerCarousel = () => {
  const { banners, loading: bannersLoading } = usePromoBanners();
  const { settings, loading: opsLoading } = useOperationsSettings();
  const [index, setIndex] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [iframeNonce, setIframeNonce] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loading = bannersLoading || opsLoading;
  const enabled = settings?.banner_enabled ?? false;
  const interval = settings?.banner_interval_ms ?? 5000;
  const items = enabled ? banners : [];

  useEffect(() => {
    if (items.length > 0) preloadPromoBannerMedia(items);
  }, [items]);

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

  const resumePausedMedia = useCallback(() => {
    const video = videoRef.current;
    if (video && !ytId && video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void video.play().catch(() => undefined);
    }
    const audio = audioRef.current;
    if (audio && audio.paused) {
      void audio.play().catch(() => undefined);
    }
  }, [ytId]);

  const handleAppReturned = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    if (ytId) {
      setIframeNonce((n) => n + 1);
      setMediaReady(false);
      return;
    }
    resumePausedMedia();
  }, [resumePausedMedia, ytId]);

  useEffect(() => {
    if (!currentIsVideo && !currentIsAudio) return;

    let cancelled = false;
    let appListener: { remove: () => void } | undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") handleAppReturned();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", handleAppReturned);
    window.addEventListener("pageshow", handleAppReturned);

    if (Capacitor.isNativePlatform()) {
      void import("@capacitor/app")
        .then(({ App }) => {
          if (cancelled) return undefined;
          return App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) handleAppReturned();
          });
        })
        .then((handle) => {
          if (!cancelled && handle) appListener = handle;
        });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", handleAppReturned);
      window.removeEventListener("pageshow", handleAppReturned);
      appListener?.remove();
    };
  }, [currentIsVideo, currentIsAudio, currentItem?.id, handleAppReturned]);

  const handleNativeVideoPause = useCallback(() => {
    window.setTimeout(() => {
      if (document.visibilityState === "visible") resumePausedMedia();
    }, 120);
  }, [resumePausedMedia]);

  useEffect(() => {
    setMediaReady(false);
  }, [currentItem?.id, currentMediaType, currentItem?.image_url, currentItem?.video_url]);

  useEffect(() => {
    if (currentIsVideo || currentIsAudio) {
      setMuted(currentItem?.video_muted ?? currentIsVideo);
    }
  }, [currentItem?.id, currentItem?.video_muted, currentIsAudio, currentIsVideo]);

  if (loading) {
    return (
      <div className="w-full" aria-hidden>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] border border-border/70 bg-secondary/30" />
      </div>
    );
  }

  if (!enabled || items.length === 0 || !currentItem) return null;

  const posterUrl = currentItem.image_url ? menuImageUrl(currentItem.image_url, BANNER_IMAGE_WIDTH) : undefined;

  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] border border-border/70 bg-primary shadow-card">
        {!mediaReady && (currentMediaType === "image" || (currentIsVideo && posterUrl)) && (
          <div className="absolute inset-0 bg-secondary/30" aria-hidden />
        )}
        {currentIsVideo && ytId ? (
          <iframe
            key={`${currentItem.id}-${iframeNonce}`}
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&cc_load_policy=0`}
            title="Vídeo promocional"
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
            frameBorder={0}
            onLoad={() => setMediaReady(true)}
          />
        ) : currentIsVideo ? (
          <video
            ref={videoRef}
            key={currentItem.id}
            src={currentItem.video_url || ""}
            poster={posterUrl}
            autoPlay
            muted={muted}
            playsInline
            loop={items.length === 1}
            preload="auto"
            onLoadedData={() => setMediaReady(true)}
            onPause={handleNativeVideoPause}
            onEnded={items.length > 1 ? goNext : undefined}
            onError={items.length > 1 ? goNext : undefined}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
            className={cn(
              "absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200",
              mediaReady || !posterUrl ? "opacity-100" : "opacity-0",
            )}
          />
        ) : currentIsAudio ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary text-secondary-foreground">
            <Music className="w-12 h-12" />
            <span className="text-sm font-semibold">Áudio promocional</span>
            <audio
              ref={audioRef}
              key={currentItem.id}
              src={currentItem.video_url || ""}
              autoPlay
              muted={muted}
              onCanPlay={() => setMediaReady(true)}
              onPause={handleNativeVideoPause}
              onEnded={items.length > 1 ? goNext : undefined}
              onError={items.length > 1 ? goNext : undefined}
            />
          </div>
        ) : (
          <img
            key={currentItem.id}
            src={menuImageUrl(currentItem.image_url ?? "", BANNER_IMAGE_WIDTH)}
            alt="Promoção"
            loading={index === 0 ? "eager" : "lazy"}
            // @ts-expect-error fetchpriority válido em HTML
            fetchpriority={index === 0 ? "high" : "auto"}
            decoding={index === 0 ? "sync" : "async"}
            onLoad={() => setMediaReady(true)}
            onError={() => setMediaReady(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200",
              mediaReady ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        {(currentIsVideo || currentIsAudio) && <div className="absolute inset-0 z-10" aria-hidden />}
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
