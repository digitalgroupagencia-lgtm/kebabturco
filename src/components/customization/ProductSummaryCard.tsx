import QuantitySelector from "@/components/QuantitySelector";

type Props = {
  imageUrl: string;
  name: string;
  priceLabel: string;
  productCode?: string | null;
  quantity: number;
  onQuantityChange: (value: number) => void;
  showQuantity?: boolean;
};

export default function ProductSummaryCard({
  imageUrl,
  name,
  priceLabel,
  productCode,
  quantity,
  onQuantityChange,
  showQuantity = true,
}: Props) {
  return (
    <section className="rounded-[22px] border border-border/50 bg-card p-3 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-3">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[16px] bg-secondary/40">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
          {productCode && (
            <span className="absolute bottom-1 left-1 rounded-md bg-foreground/85 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-background">
              {productCode}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-black leading-tight text-foreground line-clamp-2">{name}</h2>
          <p className="mt-1 text-[20px] font-black tabular-nums text-price">{priceLabel}</p>
        </div>

        {showQuantity && (
          <QuantitySelector value={quantity} onChange={onQuantityChange} min={1} max={20} variant="premium" />
        )}
      </div>
    </section>
  );
}
