import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Hash, Loader2, QrCode } from "lucide-react";
import { parseMesaQrToken } from "@/lib/mesaQrScan";
import { openTableSessionOnScan, resolveTableByNumber } from "@/services/tableSessionService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffT } from "@/hooks/useStaffT";

const MesaQrScanner = lazy(() => import("./MesaQrScanner"));

export type SellerMesaQrResult = {
  tableNumber: string;
  tableId: string;
  sessionId?: string;
  fromQr: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onResolved: (result: SellerMesaQrResult) => void;
  allowManualFallback?: boolean;
};

export default function SellerMesaQrDialog({
  open,
  onOpenChange,
  storeId,
  onResolved,
  allowManualFallback = true,
}: Props) {
  const { t } = useStaffT();
  const [manualNumber, setManualNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const qrBusyRef = useRef(false);

  const finish = (result: SellerMesaQrResult) => {
    setManualNumber("");
    setError(null);
    setLoading(false);
    setQrLoading(false);
    onResolved(result);
    onOpenChange(false);
  };

  const handleQrDetected = useCallback(
    async (raw: string) => {
      if (qrBusyRef.current || !storeId) return;
      const token = parseMesaQrToken(raw);
      if (!token) {
        setError(t("seller.mesa.qr_invalid"));
        return;
      }

      qrBusyRef.current = true;
      setQrLoading(true);
      setError(null);
      try {
        const session = await openTableSessionOnScan(storeId, token);
        onResolved({
          tableNumber: session.table_number,
          tableId: session.table_id,
          sessionId: session.session_id,
          fromQr: true,
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("seller.mesa.qr_invalid"));
      } finally {
        qrBusyRef.current = false;
        setQrLoading(false);
      }
    },
    [onOpenChange, onResolved, storeId, t],
  );

  const handleManual = async () => {
    const trimmed = manualNumber.trim();
    if (!trimmed) {
      setError(t("seller.mesa.manual_required"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resolved = await resolveTableByNumber(storeId, trimmed);
      if (!resolved) {
        setError(t("seller.mesa.not_found"));
        return;
      }
      finish({
        tableNumber: resolved.table_number,
        tableId: resolved.table_id,
        fromQr: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          setManualNumber("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92dvh] max-w-[min(100vw-1.5rem,26rem)] gap-4 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t("seller.mesa.qr_title")}
          </DialogTitle>
          <DialogDescription>{t("seller.mesa.qr_desc")}</DialogDescription>
        </DialogHeader>

        <Suspense
          fallback={
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <MesaQrScanner active={open} onDetected={(raw) => void handleQrDetected(raw)} />
        </Suspense>

        {qrLoading ? (
          <p className="text-center text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("seller.mesa.qr_validating")}
          </p>
        ) : null}

        {error ? <p className="text-center text-sm font-medium text-destructive">{error}</p> : null}

        {allowManualFallback ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("seller.mesa.manual_fallback")}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={manualNumber}
                  onChange={(e) => {
                    setManualNumber(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setError(null);
                  }}
                  inputMode="numeric"
                  placeholder="12"
                  className="h-11 pl-9"
                />
              </div>
              <Button type="button" className="h-11 shrink-0 font-bold" disabled={loading} onClick={() => void handleManual()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("seller.mesa.manual_ok")}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
