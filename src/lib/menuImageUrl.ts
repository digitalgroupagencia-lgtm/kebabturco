/**
 * URLs optimizadas para imagens do menu (Supabase Storage).
 */
export function menuImageUrl(src: string | null | undefined, width?: number): string {
  if (!src?.trim()) return "";
  try {
    const url = new URL(src, typeof window !== "undefined" ? window.location.origin : "https://kebabturco.net");
    if (
      /\.supabase\.co$/i.test(url.hostname) &&
      url.pathname.includes("/storage/v1/object/public/")
    ) {
      url.pathname = url.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/",
      );
      if (width && !url.searchParams.has("width")) {
        url.searchParams.set("width", String(width));
        url.searchParams.set("quality", "68");
        url.searchParams.set("resize", "contain");
      }
      if (!url.searchParams.has("format")) {
        // WebP reduz bastante peso sem perder qualidade perceptível no cardápio.
        url.searchParams.set("format", "webp");
      }
      return url.toString();
    }
  } catch {
    /* ignore */
  }
  return src;
}

/** Pré-carrega o primeiro banner promocional (evita flash ao abrir o cardápio). */
export function preloadPromoBannerMedia(
  banners: { media_type?: string | null; image_url?: string | null; video_url?: string | null }[],
): void {
  if (typeof window === "undefined" || banners.length === 0) return;
  const first = banners[0];
  const mediaType = first.media_type ?? "image";
  if (mediaType === "image" && first.image_url) {
    const img = new Image();
    img.decoding = "async";
    // @ts-expect-error fetchpriority válido em HTML
    img.fetchpriority = "high";
    img.src = menuImageUrl(first.image_url, 820);
    return;
  }
  if (mediaType === "video" && first.image_url) {
    const img = new Image();
    img.decoding = "async";
    img.src = menuImageUrl(first.image_url, 820);
  }
}

/** Pré-carrega imagens em memória para aparecerem de imediato no cardápio. */
export function preloadMenuImages(
  categories: { image?: string }[],
  products: { image?: string }[],
): void {
  if (typeof window === "undefined") return;
  const urls = new Set<string>();
  for (const cat of categories) {
    if (cat.image) urls.add(menuImageUrl(cat.image, 160));
  }
  for (const prod of products.slice(0, 42)) {
    if (prod.image) urls.add(menuImageUrl(prod.image, 360));
  }

  const hydrate = () => {
    for (const href of urls) {
      const img = new Image();
      img.decoding = "async";
      img.src = href;
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(hydrate, { timeout: 800 });
  } else {
    window.setTimeout(hydrate, 60);
  }
}
