import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "onLoad"> & {
  src: string | null | undefined;
  alt: string;
  /** Card aspect ratio container. Default: deixar o pai controlar. */
  aspect?: string;
  /** Prioridade alta: pré-carrega, sem lazy, fetchpriority=high. */
  priority?: boolean;
  /** Largura alvo em px para variante responsiva (Supabase image transform). */
  targetWidth?: number;
  /** Classe do wrapper. */
  wrapperClassName?: string;
  /** Cor do skeleton. */
  skeletonClassName?: string;
  /** Placeholder fallback quando src vazio. */
  fallbackSrc?: string;
};

/**
 * Aplica Supabase image transform quando a URL é /storage/v1/object/public/.
 * Converte para /render/image/public/ com width/quality/format=auto.
 */
function transformUrl(src: string, width?: number): string {
  if (!src) return src;
  try {
    const url = new URL(src, window.location.origin);
    if (
      url.pathname.includes("/storage/v1/object/public/") &&
      /supabase\.co$/i.test(url.hostname.replace(/^.+\./, "supabase.co"))
    ) {
      url.pathname = url.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/",
      );
      if (width && !url.searchParams.has("width")) {
        url.searchParams.set("width", String(width));
        url.searchParams.set("quality", "70");
        url.searchParams.set("resize", "cover");
      }
      return url.toString();
    }
  } catch {
    /* ignore */
  }
  return src;
}

/**
 * Imagem com skeleton, fade-in suave e suporte a prioridade.
 * - Sem layout shift: pai define aspect-ratio.
 * - Nada de "imagem em partes": opacity 0 → 1 só quando completa.
 * - priority=true: eager + fetchpriority=high para above-the-fold.
 */
export default function SmartImage({
  src,
  alt,
  aspect,
  priority = false,
  targetWidth,
  wrapperClassName,
  skeletonClassName,
  fallbackSrc = "/product-placeholder.svg",
  className,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const effective = src && src.trim() ? src : fallbackSrc;
  const finalSrc = errored ? fallbackSrc : transformUrl(effective, targetWidth);

  // Detecta cache: se a imagem já está pronta no mount (cache), marca loaded.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [finalSrc]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {!loaded && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 bg-gradient-to-br from-secondary/40 via-secondary/30 to-secondary/40",
            "animate-pulse",
            skeletonClassName,
          )}
        />
      )}
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        // @ts-ignore — fetchpriority é válido em HTML mas o tipo ainda não cobre
        fetchpriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored) setErrored(true);
          setLoaded(true);
        }}
        draggable={false}
        className={cn(
          "h-full w-full object-cover object-center transition-opacity duration-150 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
