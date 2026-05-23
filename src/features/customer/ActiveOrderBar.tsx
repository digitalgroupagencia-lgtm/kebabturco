import { ChevronRight, Package } from "lucide-react";
import { useActiveOrder } from "./useActiveOrder";

const ActiveOrderBar = () => {
  const { hasActiveOrder, displayNumber, statusLabel, trackOrder, loading } = useActiveOrder();

  if (loading || !hasActiveOrder) return null;

  return (
    <button
      type="button"
      onClick={trackOrder}
      className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl bg-primary text-primary-foreground shadow-md active:scale-[0.98] transition-transform touch-action-manipulation"
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-foreground/15 shrink-0">
        <Package className="w-5 h-5" />
      </span>
      <span className="flex-1 text-left min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wider opacity-80">Pedido activo</span>
        <span className="block font-black text-base truncate">
          #{displayNumber} · {statusLabel}
        </span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 opacity-80" />
    </button>
  );
};

export default ActiveOrderBar;
