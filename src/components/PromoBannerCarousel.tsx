import { useEffect, useState } from "react";
import { usePromoBanners } from "@/hooks/usePromoBanners";
import { useOperationsSettings } from "@/hooks/useOperationsSettings";
import bannerDefault from "@/assets/elrey/banner-default-1.jpg";

const PromoBannerCarousel = () => {
  const { banners } = usePromoBanners();
  const { settings } = useOperationsSettings();
  const [index, setIndex] = useState(0);

  const enabled = settings?.banner_enabled ?? false;
  const interval = settings?.banner_interval_ms ?? 5000;

  // Fallback: se admin não desativou explicitamente, mostra banner default quando não há nenhum cadastrado
  const showFallback = !enabled && banners.length === 0;
  const list = banners.length > 0 ? banners.map((b) => b.image_url) : showFallback ? [bannerDefault] : [];

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), interval);
    return () => clearInterval(t);
  }, [list.length, interval]);

  if (!enabled && banners.length === 0 && !showFallback) return null;
  if (list.length === 0) return null;

  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] w-full rounded-[22px] overflow-hidden shadow-card border border-border/70 bg-secondary/40">
        {list.map((url, i) => (
          <img
            key={url + i}
            src={url}
            alt="Promoção"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        {list.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {list.map((_, i) => (
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