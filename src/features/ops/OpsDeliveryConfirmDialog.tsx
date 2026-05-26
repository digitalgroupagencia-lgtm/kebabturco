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
import { ShieldCheck } from "lucide-react";
import type { PanelOrder } from "./usePanelOrders";
import { validateDeliveryCode } from "./opsOrderUi";

type Props = {
  order: PanelOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (order: PanelOrder, code: string) => void | Promise<void>;
  confirming?: boolean;
};

const OpsDeliveryConfirmDialog = ({ order, open, onOpenChange, onConfirm, confirming }: Props) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
    }
  }, [open, order?.id]);

  const valid = validateDeliveryCode(code);

  const handleConfirm = async () => {
    if (!order || !valid) {
      setError("Introduza o código de 4 dígitos.");
      return;
    }
    setError(null);
    try {
      await onConfirm(order, code.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código incorrecto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            Confirmar entrega
          </DialogTitle>
          <DialogDescription>
            {order
              ? `Pedido #${order.order_number} — peça o código ao cliente e digite-o para concluir a entrega.`
              : "Valide a entrega com o código do cliente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delivery-code" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Código de confirmação
          </Label>
          <Input
            id="delivery-code"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={code}
            disabled={confirming}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
              setError(null);
            }}
            className="h-12 text-center text-2xl font-black tracking-[0.3em] tabular-nums"
            autoComplete="one-time-code"
          />
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={confirming} onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            disabled={!valid || confirming}
            className="font-bold bg-orange-600 hover:bg-orange-700"
            onClick={() => void handleConfirm()}
          >
            {confirming ? "A validar…" : "Concluir entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpsDeliveryConfirmDialog;
