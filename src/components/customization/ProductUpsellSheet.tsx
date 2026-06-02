import type { MenuProduct } from "@/hooks/useMenuData";
import { useLanguage } from "@/contexts/LanguageContext";
import UpsellProductCard from "@/components/customization/UpsellProductCard";
import { X } from "lucide-react";

type Props = {
  title: string;
  suggestions: MenuProduct[];
  menuProducts?: MenuProduct[];
  onPick: (productId: string) => void;
  onSkip: () => void;
};

export default function ProductUpsellSheet({
  title,
  suggestions,
  menuProducts = [],
  onPick,
  onSkip,
}: Props) {
  const { t } = useLanguage();

  if (suggestions.length === 0) return null;

  const catalog = menuProducts.length > 0 ? menuProducts : suggestions;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="bg-background rounded-t-[28px] border-t border-border/60 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)] max-h-[78vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("upsellEyebrow")}
            </p>
            <h2 className="text-xl font-black text-foreground leading-tight mt-1">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="w-9 h-9 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground"
            aria-label={t("close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar snap-x snap-mandatory">
          {suggestions.map((product) => (
            <UpsellProductCard
              key={product.id}
              product={product}
              menuProducts={catalog}
              onClick={() => onPick(product.id)}
              className="snap-start"
            />
          ))}
        </div>

        <div className="px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/50">
          <button
            type="button"
            onClick={onSkip}
            className="w-full h-12 rounded-2xl border border-border font-bold text-muted-foreground"
          >
            {t("upsellSkip")}
          </button>
        </div>
      </div>
    </div>
  );
}
