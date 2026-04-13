import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  name: Record<string, string>;
  image: string;
  icon: string;
  isActive?: boolean;
  onClick: () => void;
}

const CategoryCard = ({ name, image, icon, isActive, onClick }: Props) => {
  const { tProduct } = useLanguage();

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all touch-action-manipulation min-w-[80px] ${
        isActive
          ? "bg-primary text-primary-foreground shadow-elevated scale-105"
          : "bg-card text-foreground border border-border"
      }`}
    >
      <img src={image} alt={tProduct(name)} className="w-12 h-12 object-contain" loading="lazy" />
      <span className="text-xs font-bold text-center leading-tight">{tProduct(name)}</span>
    </button>
  );
};

export default CategoryCard;
