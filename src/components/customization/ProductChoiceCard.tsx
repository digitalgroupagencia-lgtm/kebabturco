import { Check } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string | null;
  priceLabel?: string | null;
  imageUrl?: string | null;
  selected: boolean;
  onClick: () => void;
  layout?: "horizontal" | "vertical";
};

export default function ProductChoiceCard({
  title,
  subtitle,
  priceLabel,
  imageUrl,
  selected,
  onClick,
  layout = "vertical",
}: Props) {
  const imageBlock = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-secondary/40 ${
        layout === "horizontal" ? "w-20 h-20" : "w-full aspect-[4/3]"
      }`}
    >
      <img
        src={imageUrl || "/placeholder.svg"}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        draggable={false}
      />
    </div>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left transition-all active:scale-[0.98] overflow-hidden rounded-[22px] border ${
        selected
          ? "border-emerald-500 bg-emerald-500/8 ring-2 ring-emerald-500/20 shadow-[0_10px_28px_-16px_rgba(16,185,129,0.55)]"
          : "border-border/70 bg-card shadow-[0_8px_24px_-16px_rgba(0,0,0,0.25)]"
      } ${layout === "horizontal" ? "flex items-center gap-4 p-3" : "flex flex-col"}`}
    >
      {selected && (
        <span className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
          <Check className="w-4 h-4" strokeWidth={3} />
        </span>
      )}

      {layout === "vertical" ? (
        <>
          <div className="p-3 pb-0">{imageBlock}</div>
          <div className="p-4 pt-3 space-y-1">
            <p className="text-[15px] font-black text-foreground leading-tight">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground font-semibold">{subtitle}</p>}
            {priceLabel && (
              <p className="text-sm font-black text-price tabular-nums pt-1">{priceLabel}</p>
            )}
          </div>
        </>
      ) : (
        <>
          {imageBlock}
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-base font-black text-foreground leading-tight">{title}</p>
            {subtitle && <p className="text-xs text-emerald-700 font-semibold mt-1">{subtitle}</p>}
            {priceLabel && (
              <p className="text-sm font-black text-price tabular-nums mt-1">{priceLabel}</p>
            )}
          </div>
        </>
      )}
    </button>
  );
}
