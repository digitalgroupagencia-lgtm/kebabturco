import type { ElementType } from "react";
import { ChefHat, ShoppingBag, UtensilsCrossed, Truck, LayoutGrid } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";
import type { StaffI18nKey } from "@/lib/staffI18n";
import type { PanelOrder } from "./usePanelOrders";

export type OpsViewMode = "all" | "kitchen" | "counter" | "table" | "delivery";

const modes: { id: OpsViewMode; labelKey: StaffI18nKey; icon: ElementType }[] = [
  { id: "all", labelKey: "ops.mode.all", icon: LayoutGrid },
  { id: "kitchen", labelKey: "ops.mode.kitchen", icon: ChefHat },
  { id: "counter", labelKey: "ops.mode.counter", icon: ShoppingBag },
  { id: "table", labelKey: "ops.mode.table", icon: UtensilsCrossed },
  { id: "delivery", labelKey: "ops.mode.delivery", icon: Truck },
];

function resolveOrderType(order: PanelOrder): string {
  if (order.order_type) return order.order_type;
  if (order.delivery_street) return "delivery";
  if (order.table_number) return "dine_in";
  return "takeaway";
}

export function filterOrdersByMode(orders: PanelOrder[], mode: OpsViewMode): PanelOrder[] {
  if (mode === "all") return orders;
  if (mode === "kitchen") {
    return orders.filter((o) => o.status === "pending" || o.status === "preparing");
  }
  if (mode === "delivery") {
    return orders.filter((o) => resolveOrderType(o) === "delivery");
  }
  if (mode === "table") {
    return orders.filter((o) => resolveOrderType(o) === "dine_in");
  }
  return orders.filter((o) => resolveOrderType(o) === "takeaway");
}

export function countOrdersByMode(orders: PanelOrder[], mode: OpsViewMode): number {
  return filterOrdersByMode(orders, mode).length;
}

interface OpsModeFilterProps {
  selected: OpsViewMode;
  onSelect: (mode: OpsViewMode) => void;
  orders: PanelOrder[];
}

const OpsModeFilter = ({ selected, onSelect, orders }: OpsModeFilterProps) => {
  const { t } = useStaffT();
  return (
  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
    {modes.map(({ id, labelKey, icon: Icon }) => {
      const count = countOrdersByMode(orders, id);
      const active = selected === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-bold text-xs transition-all touch-action-manipulation ${
            active
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border text-foreground"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t(labelKey)}</span>
          {count > 0 && (
            <span
              className={`min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
                active ? "bg-background/20" : "bg-muted text-muted-foreground"
              }`}
            >
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
  );
};

export default OpsModeFilter;
