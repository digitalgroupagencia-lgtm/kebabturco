import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { OpenStatus } from "@/lib/storeHours";

interface Props {
  open: boolean;
  status: OpenStatus;
  channel: "store" | "delivery";
  onKeep: () => void;
}

const StoreClosedDialog = ({ open, status, channel, onKeep }: Props) => {
  const nextText = status.nextOpenLabel
    ? `Reabre ${status.nextOpenDayLabel === "hoje" ? "hoje" : status.nextOpenDayLabel ?? "em breve"} às ${status.nextOpenLabel}`
    : "Reabre em breve";

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            {channel === "delivery" ? "Delivery fechado" : "Loja fechada no momento"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {nextText}. Pode manter o pedido preparado e finalizar quando reabrir.
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full h-12 font-bold" onClick={onKeep}>
          Manter pedido
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default StoreClosedDialog;
