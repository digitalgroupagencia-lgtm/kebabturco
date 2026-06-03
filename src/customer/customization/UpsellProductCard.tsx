import { useState } from "react";
import type { MenuProduct } from "@/hooks/useMenuData";
import { useLanguage } from "@/contexts/LanguageContext";
import { parseProductCode } from "@/lib/parseProductCode";
import { splitProductName } from "@/lib/splitProductName";
import { resolveMenuProductDisplayImage } from "@/lib/modifiers/productDisplayImage";
import { Plus } from "lucide-react";

type Props = {
  product: MenuProduct;
  menuProducts?: MenuProduct[];
  onClick: () => void;
  className?: string;
};

export default function UpsellProductCard({ product, menuProducts = [], onClick, className = "" }: Props) {
  const { tProduct } = useLanguage();
  const [broken, setBroken] = useState(false);

  const { name: cleanName } = parseProductCode(tProduct(product.name));
  const [l1, l2] = splitProductName(cleanName);
  const imageSrc = broken
    ? "/product-placeholder.svg"
    : resolveMenuProductDisplayImage(product, menuProducts.length ? menuProducts : [product]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group shrink-0 w-[142px] overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-card active:scale-[0.97] transition-transform touch-action-manipulation ${className}`}
    >
      <div className="aspect-[5/4] p-2 pb-1">
        <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-secondary/30 ring-1 ring-border/30">
          <SmartImage
            src={imageSrc}
            alt={cleanName}
            targetWidth={200}
            className="h-full w-full object-cover object-center"
            onError={() => setBroken(true)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-2.5 pt-1 pb-2.5">
        <span className="min-h-[34px] text-[13px] font-bold leading-[1.2] text-foreground line-clamp-2">
          <span className="block">{l1}</span>
          {l2 && <span className="block">{l2}</span>}
        </span>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-black tabular-nums text-price tracking-tight">
            {product.price.toFixed(2)}€
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm group-active:scale-90 transition-transform">
            <Plus className="h-4 w-4" strokeWidth={3} />
          </span>
        </div>
      </div>
    </button>
  );
}
