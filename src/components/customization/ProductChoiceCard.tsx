import { useState } from "react";
import { Check, Heart } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string | null;
  priceLabel?: string | null;
  imageUrl?: string | null;
  selected: boolean;
  onClick: () => void;
  layout?: "horizontal" | "vertical";
  compact?: boolean;
};

export default function ProductChoiceCard({
  title,
  subtitle,
  priceLabel,
  imageUrl,
  selected,
  onClick,
  layout = "vertical",
  compact = false,
}: Props) {
  const [broken, setBroken] = useState(false);
  const src = broken || !imageUrl ? "/placeholder.svg" : imageUrl;

  const imageBlock = (
    <div
      className={`relative shrink-0 overflow-hidden bg-secondary/30 ${
        layout === "horizontal"
          ? "h-20 w-20 rounded-[14px]"
          : compact
            ? "aspect-square w-full rounded-t-[14px]"
            : "aspect-[5/4] w-full rounded-t-[16px]"
      }`}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        draggable={false}
        onError={() => setBroken(true)}
      />
      {selected && compact && (
        <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Heart className="h-3 w-3 fill-current" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-[16px] border text-left transition-all active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-[0_8px_20px_-14px_rgba(139,0,0,0.45)]"
          : "border-border/60 bg-card shadow-[0_6px_18px_-16px_rgba(0,0,0,0.2)]"
      } ${layout === "horizontal" ? "flex items-center gap-4 p-3" : "flex flex-col"}`}
    >
      {selected && !compact && (
        <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}

      {layout === "vertical" ? (
        <>
          {imageBlock}
          <div className={`space-y-0.5 ${compact ? "p-2 pt-1.5 text-center" : "p-3 pt-2"}`}>
            <p
              className={`font-bold leading-tight text-foreground line-clamp-2 ${
                compact ? "text-[11px]" : "text-[14px] font-black"
              }`}
            >
              {title}
            </p>
            {subtitle && (
              <p className={`font-semibold text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>{subtitle}</p>
            )}
            {priceLabel && (
              <p className={`font-black tabular-nums text-price ${compact ? "pt-0.5 text-[11px]" : "pt-1 text-sm"}`}>
                {priceLabel}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {imageBlock}
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-base font-black leading-tight text-foreground">{title}</p>
            {subtitle && <p className="mt-1 text-xs font-semibold text-emerald-700">{subtitle}</p>}
            {priceLabel && <p className="mt-1 text-sm font-black tabular-nums text-price">{priceLabel}</p>}
          </div>
        </>
      )}
    </button>
  );
}
