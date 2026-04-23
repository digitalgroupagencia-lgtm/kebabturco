import { useLanguage } from "@/contexts/LanguageContext";
import { splitProductName } from "@/lib/splitProductName";

interface Props {
  name: Record<string, string>;
  image: string;
  price?: number;
  onClick: () => void;
  badge?: string;
}

const ProductCard = ({ name, image, price, onClick, badge }: Props) => {
  const { tProduct } = useLanguage();
  const fullName = tProduct(name);
  const [line1, line2] = splitProductName(fullName);

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center bg-card rounded-2xl border border-border/60 p-4 active:scale-[0.97] hover:border-border transition-all touch-action-manipulation overflow-hidden"
    >
      {badge && (
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          {badge}
        </span>
      )}
      <img
        src={image}
        alt={tProduct(name)}
        className="w-32 h-32 object-contain mb-3"
        loading="lazy"
      />
      <span className="text-[15px] font-bold text-foreground text-center leading-tight min-h-[2.75rem] flex flex-col items-center justify-center px-1">
        <span className="block w-full">{line1}</span>
        {line2 && <span className="block w-full">{line2}</span>}
      </span>
      {price !== undefined && (
        <span className="text-base font-bold text-price mt-2 tabular-nums">
          {price.toFixed(2)}€
        </span>
      )}
    </button>
  );
};

export default ProductCard;
