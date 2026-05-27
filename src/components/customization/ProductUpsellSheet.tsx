import type { MenuProduct } from "@/hooks/useMenuData";
import { useLanguage } from "@/contexts/LanguageContext";
import { parseProductCode } from "@/lib/parseProductCode";
import { splitProductName } from "@/lib/splitProductName";
import { Plus, X } from "lucide-react";

type Props = {
  title: string;
  suggestions: MenuProduct[];
  onPick: (productId: string) => void;
  onSkip: () => void;
};

export default function ProductUpsellSheet({ title, suggestions, onPick, onSkip }: Props) {
  const { tProduct } = useLanguage();

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="bg-background rounded-t-[28px] border-t border-border/60 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)] max-h-[78vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Sugestão</p>
            <h2 className="text-xl font-black text-foreground leading-tight mt-1">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="w-9 h-9 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-3 grid grid-cols-2 gap-2.5">
          {suggestions.map((product) => {
            const { name: cleanName } = parseProductCode(tProduct(product.name));
            const [l1, l2] = splitProductName(cleanName);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onPick(product.id)}
                className="group flex flex-col bg-card rounded-2xl border border-border/60 overflow-hidden text-left active:scale-[0.98] transition-transform"
              >
                <div className="aspect-[5/4] px-2 pt-2 pb-1">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={cleanName}
                    className="w-full h-full object-cover rounded-[16px]"
                    loading="lazy"
                  />
                </div>
                <div className="px-2.5 pt-1 pb-2.5 flex flex-col gap-1.5 flex-1">
                  <span className="text-[13px] font-bold text-foreground leading-[1.2] min-h-[32px]">
                    <span className="block">{l1}</span>
                    {l2 && <span className="block">{l2}</span>}
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-[15px] font-black text-price tabular-nums">
                      {product.price.toFixed(2)}€
                    </span>
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/50">
          <button
            type="button"
            onClick={onSkip}
            className="w-full h-12 rounded-2xl border border-border font-bold text-muted-foreground"
          >
            Continuar sem adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
