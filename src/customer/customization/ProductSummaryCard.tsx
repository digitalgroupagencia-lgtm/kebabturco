import QuantitySelector from "@/components/QuantitySelector";
import SmartImage from "@/components/SmartImage";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl: string;
  name: string;
  priceLabel: string;
  productCode?: string | null;
  quantity: number;
  onQuantityChange: (value: number) => void;
  showQuantity?: boolean;
  summaryTitle?: string;
  selectionLines?: string[];
  note?: string | null;
  quantityLabel?: string;
  className?: string;
};

export default function ProductSummaryCard({
  imageUrl,
  name,
  priceLabel,
  productCode,
  quantity,
  onQuantityChange,
  showQuantity = true,
  summaryTitle,
  selectionLines = [],
  note,
  quantityLabel = "Cantidad",
  className,
}: Props) {
  const hasImage = Boolean(imageUrl?.trim());
  const isHero = Boolean(summaryTitle);

  if (!isHero) {
    return (
      <section
        className={cn(
          "rounded-[22px] border border-border/50 bg-card p-3 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.28)]",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[16px] bg-secondary/40">
            {hasImage ? (
              <SmartImage
                src={imageUrl}
                alt={name}
                className="h-full w-full object-cover"
                targetWidth={160}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UtensilsCrossed className="h-7 w-7 text-muted-foreground/50" aria-hidden />
              </div>
            )}
            {productCode ? (
              <span className="absolute bottom-1 left-1 rounded-md bg-foreground/85 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-background">
                {productCode}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-black leading-tight text-foreground line-clamp-2">{name}</h2>
            <p className="mt-1 text-[20px] font-black tabular-nums text-price">{priceLabel}</p>
          </div>
          {showQuantity ? (
            <QuantitySelector value={quantity} onChange={onQuantityChange} min={1} max={20} variant="premium" />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("flex w-full flex-col gap-3", className)}>
      <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-card">
        {hasImage ? (
          <SmartImage
            src={imageUrl}
            alt={name}
            className="aspect-[4/3] w-full object-cover"
            targetWidth={720}
            priority
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
            <UtensilsCrossed className="h-14 w-14 text-muted-foreground/50" aria-hidden />
          </div>
        )}
        {productCode ? (
          <span className="absolute bottom-3 left-3 rounded-md bg-foreground/85 px-2 py-1 text-[10px] font-black tabular-nums text-background">
            {productCode}
          </span>
        ) : null}
      </div>

      <h3 className="px-0.5 text-xl font-black tracking-tight text-foreground">{summaryTitle}</h3>

      <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 text-[16px] font-black uppercase leading-tight tracking-wide text-foreground line-clamp-2">
            {name}
          </h2>
          <span className="shrink-0 text-[17px] font-black tabular-nums text-price">{priceLabel}</span>
        </div>
        {selectionLines.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {selectionLines.map((line) => (
              <li key={line} className="leading-snug">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {note?.trim() ? (
          <p className="mt-2 text-sm italic text-muted-foreground">"{note.trim()}"</p>
        ) : null}
      </div>

      {showQuantity ? (
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-card">
          <span className="font-bold text-foreground">{quantityLabel}</span>
          <QuantitySelector value={quantity} onChange={onQuantityChange} min={1} max={99} variant="premium" />
        </div>
      ) : null}
    </section>
  );
}
