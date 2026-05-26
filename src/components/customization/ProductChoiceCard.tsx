import { useState } from "react";
import { Check } from "lucide-react";

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
      className={`relative shrink-0 overflow-hidden rounded-xl bg-secondary/50 ${
        layout === "horizontal"
          ? "w-20 h-20"
          : compact
            ? "w-full aspect-square"
            : "w-full aspect-[4/3]"
      }`}
    >
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain p-1"
        loading="lazy"
        draggable={false}
        onError={() => setBroken(true)}
      />
    </div>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left transition-all active:scale-[0.98] overflow-hidden rounded-[18px] border ${
        selected
          ? "border-emerald-500 bg-emerald-500/8 ring-2 ring-emerald-500/20 shadow-[0_8px_20px_-14px_rgba(16,185,129,0.55)]"
          : "border-border/70 bg-card shadow-[0_6px_18px_-14px_rgba(0,0,0,0.22)]"
      } ${layout === "horizontal" ? "flex items-center gap-4 p-3" : "flex flex-col"}`}
    >
      {selected && (
        <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </span>
      )}

      {layout === "vertical" ? (
        <>
          <div className={`${compact ? "p-2 pb-0" : "p-3 pb-0"}`}>{imageBlock}</div>
          <div className={`${compact ? "p-2 pt-1.5" : "p-3 pt-2"} space-y-0.5`}>
            <p
              className={`font-black text-foreground leading-tight line-clamp-2 ${
                compact ? "text-[11px] text-center" : "text-[15px]"
              }`}
            >
              {title}
            </p>
            {subtitle && (
              <p className={`text-muted-foreground font-semibold ${compact ? "text-[10px] text-center" : "text-xs"}`}>
                {subtitle}
              </p>
            )}
            {priceLabel && (
              <p className={`font-black text-price tabular-nums ${compact ? "text-[11px] text-center pt-0.5" : "text-sm pt-1"}`}>
                {priceLabel}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {imageBlock}
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-base font-black text-foreground leading-tight">{title}</p>
            {subtitle && <p className="text-xs text-emerald-700 font-semibold mt-1">{subtitle}</p>}
            {priceLabel && <p className="text-sm font-black text-price tabular-nums mt-1">{priceLabel}</p>}
          </div>
        </>
      )}
    </button>
  );
}
