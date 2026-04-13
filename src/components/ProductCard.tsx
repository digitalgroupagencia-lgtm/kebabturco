import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  name: Record<string, string>;
  image: string;
  price?: number;
  onClick: () => void;
  badge?: string;
}

const ProductCard = ({ name, image, price, onClick, badge }: Props) => {
  const { tProduct } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center bg-card rounded-2xl shadow-card border border-border p-3 active:scale-95 transition-transform touch-action-manipulation overflow-hidden"
    >
      {badge && (
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <img src={image} alt={tProduct(name)} className="w-28 h-28 object-contain mb-2" loading="lazy" />
      <span className="text-sm font-bold text-foreground text-center leading-tight">{tProduct(name)}</span>
      {price !== undefined && (
        <span className="text-base font-black text-primary mt-1">€{price.toFixed(2)}</span>
      )}
    </button>
  );
};

export default ProductCard;
