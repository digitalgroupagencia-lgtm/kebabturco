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
        url.searchParams.set("quality", "75");
        url.searchParams.set("resize", "contain");
      }
      return url.toString();
    }
  } catch {
    /* ignore */
  }
  return src;
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
  for (const prod of products.slice(0, 14)) {
    if (prod.image) urls.add(menuImageUrl(prod.image, 360));
  }
  for (const href of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = href;
  }
}
