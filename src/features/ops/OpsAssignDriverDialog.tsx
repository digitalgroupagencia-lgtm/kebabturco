import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bike, Loader2 } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import type { PanelOrder } from "./usePanelOrders";

export type StoreDriver = { user_id: string; full_name: string };

type Props = {
  order: PanelOrder | null;
  drivers: StoreDriver[];
  loadingDrivers?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (order: PanelOrder, driverUserId: string) => void | Promise<void>;
  assigning?: boolean;
};

const OpsAssignDriverDialog = ({
  order,
  drivers,
  loadingDrivers,
  open,
  onOpenChange,
  onConfirm,
  assigning,
}: Props) => {
  const { t, lang } = useStaffT();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelected(drivers[0]?.user_id ?? null);
  }, [open, order?.id, drivers]);

  const description = order
    ? panelT(lang, "dialog.assign.desc_order", { code: order.order_number })
    : t("dialog.assign.desc");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bike className="h-5 w-5 text-orange-500" />
            {t("dialog.assign.title")}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loadingDrivers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("dialog.assign.no_drivers")}</p>
        ) : (
          <div className="grid gap-2">
            {drivers.map((d) => (
              <button
                key={d.user_id}
                type="button"
                disabled={assigning}
                onClick={() => setSelected(d.user_id)}
                className={`h-12 rounded-xl border-2 px-4 text-left font-bold transition-colors touch-action-manipulation ${
                  selected === d.user_id
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-border hover:border-orange-500/40"
                }`}
              >
                {d.full_name}
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={assigning} onClick={() => onOpenChange(false)}>
            {t("common.back")}
          </Button>
          <Button
            type="button"
            disabled={!selected || assigning || drivers.length === 0}
            className="font-bold bg-orange-600 hover:bg-orange-700"
            onClick={() => order && selected && void onConfirm(order, selected)}
          >
            {assigning ? t("dialog.assign.assigning") : t("dialog.assign.btn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpsAssignDriverDialog;
