import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { menuImageUrl } from "@/lib/menuImageUrl";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "onLoad"> & {
  src: string | null | undefined;
  alt: string;
  aspect?: string;
  priority?: boolean;
  targetWidth?: number;
  wrapperClassName?: string;
  skeletonClassName?: string;
  fallbackSrc?: string;
};

const hotImageCache = new Set<string>();

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
  const finalSrc = errored ? fallbackSrc : menuImageUrl(effective, targetWidth);
  const isHot = hotImageCache.has(finalSrc);

  useEffect(() => {
    setLoaded(isHot);
    setErrored(false);
  }, [finalSrc, isHot]);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      hotImageCache.add(finalSrc);
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
            "absolute inset-0 bg-secondary/35",
            skeletonClassName,
          )}
        />
      )}
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        // @ts-expect-error fetchpriority válido em HTML
        fetchpriority={priority || isHot ? "high" : "auto"}
        decoding={priority || isHot ? "sync" : "async"}
        onLoad={() => {
          hotImageCache.add(finalSrc);
          setLoaded(true);
        }}
        onError={() => {
          if (!errored) setErrored(true);
          setLoaded(true);
        }}
        draggable={false}
        className={cn(
          "max-h-full max-w-full object-contain object-center transition-opacity duration-150 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
