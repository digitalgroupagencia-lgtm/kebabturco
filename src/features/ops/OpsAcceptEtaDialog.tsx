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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import type { PanelOrder } from "./usePanelOrders";
import { ETA_QUICK_OPTIONS, validateAcceptPrepMinutes } from "./opsOrderUi";

type Props = {
  order: PanelOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (order: PanelOrder, minutes: number) => void | Promise<void>;
  confirming?: boolean;
};

const OpsAcceptEtaDialog = ({ order, open, onOpenChange, onConfirm, confirming }: Props) => {
  const [selected, setSelected] = useState<number | null>(15);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(15);
      setCustom("");
    }
  }, [open, order?.id]);

  const customMinutes = custom.trim() ? Number.parseInt(custom, 10) : null;
  const useCustom = custom.trim().length > 0;
  const resolvedMinutes = useCustom ? customMinutes : selected;
  const valid = validateAcceptPrepMinutes(resolvedMinutes ?? undefined);

  const handleConfirm = async () => {
    if (!order || !valid || resolvedMinutes == null) return;
    await onConfirm(order, resolvedMinutes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Tempo estimado
          </DialogTitle>
          <DialogDescription>
            {order
              ? `Pedido #${order.order_number} — escolha quando fica pronto. O cliente vê este tempo no acompanhamento.`
              : "Escolha o tempo estimado de preparação."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {ETA_QUICK_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={confirming}
              onClick={() => {
                setSelected(m);
                setCustom("");
              }}
              className={`h-11 rounded-lg text-sm font-bold touch-action-manipulation border-2 transition-colors ${
                !useCustom && selected === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-transparent hover:border-border"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="eta-custom" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Personalizado (minutos)
          </Label>
          <Input
            id="eta-custom"
            type="number"
            min={5}
            max={180}
            inputMode="numeric"
            placeholder="Ex.: 18"
            value={custom}
            disabled={confirming}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={confirming} onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button type="button" disabled={!valid || confirming} className="font-bold" onClick={() => void handleConfirm()}>
            {confirming ? "A aceitar…" : "Aceitar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpsAcceptEtaDialog;
