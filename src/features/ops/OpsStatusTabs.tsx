import { Clock, ChefHat, Package, CheckCircle2, XCircle } from "lucide-react";
import { getStatusLabel, type OrderStatus } from "@/lib/orderStatusLabels";
import { panelColumnStatus } from "@/lib/orderOperationalFlow";
import type { PanelOrder } from "./usePanelOrders";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Package,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

interface OpsStatusTabsProps {
  columns: OrderStatus[];
  orders: PanelOrder[];
  selected: OrderStatus;
  onSelect: (status: OrderStatus) => void;
}

const OpsStatusTabs = ({ columns, orders, selected, onSelect }: OpsStatusTabsProps) => {
  const countByStatus = (status: OrderStatus) =>
    orders.filter((o) => panelColumnStatus(o.status) === status).length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none md:hidden">
      {columns.map((status) => {
        const Icon = statusIcons[status] || Clock;
        const count = countByStatus(status);
        const active = selected === status;
        return (
          <button
            key={status}
            type="button"
            onClick={() => onSelect(status)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all touch-action-manipulation ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="whitespace-nowrap">{getStatusLabel(status)}</span>
            {count > 0 && (
              <span
                className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-black flex items-center justify-center ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
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

export default OpsStatusTabs;
