import { useCallback, useRef, useState, lazy, Suspense } from "react";
import { Hash, QrCode, UtensilsCrossed } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { parseMesaQrToken } from "@/lib/mesaQrScan";
import { openTableSessionOnScan, resolveTableByQrToken, resolveTableByNumber } from "@/services/tableSessionService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MesaQrScanner = lazy(() => import("@/customer/components/MesaQrScanner"));

type MesaSetupDialogProps = {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onManualConfirm: (tableNumber: string, tableId: string) => void;
  onQrConfirm: (tableNumber: string, tableId: string, qrToken: string) => void;
};

const MesaSetupDialog = ({
  open,
  storeId,
  onClose,
  onManualConfirm,
  onQrConfirm,
}: MesaSetupDialogProps) => {
  const { t } = useLanguage();
  const [manualNumber, setManualNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const qrBusyRef = useRef(false);

  const resetAndClose = () => {
    setManualNumber("");
    setError(null);
    setLoading(false);
    setQrLoading(false);
    onClose();
  };

  const resolveTableByToken = async (token: string) => {
    if (!storeId) return null;
    const resolved = await resolveTableByQrToken(storeId, token);
    if (!resolved) return null;
    return { id: resolved.table_id, number: resolved.table_number };
  };

  const handleQrDetected = useCallback(
    async (raw: string) => {
      if (qrBusyRef.current) return;
      const token = parseMesaQrToken(raw);
      if (!token) {
        setError(t("mesaQrInvalid"));
        return;
      }

      qrBusyRef.current = true;
      setQrLoading(true);
      setError(null);
      try {
        const table = await resolveTableByToken(token);
        if (!table) {
          setError(t("mesaManualNotFound"));
          return;
        }
        try {
          await openTableSessionOnScan(storeId, token);
        } catch {
          /* sessão pode já existir */
        }
        onQrConfirm(table.number, table.id, token);
        setManualNumber("");
        setError(null);
      } finally {
        qrBusyRef.current = false;
        setQrLoading(false);
      }
    },
    [onQrConfirm, storeId, t],
  );

  const handleManualConfirm = async () => {
    const trimmed = manualNumber.trim();
    if (!trimmed) {
      setError(t("mesaManualRequired"));
      return;
    }
    if (!storeId) {
      setError(t("mesaManualNotFound"));
      return;
    }

    setLoading(true);
    setError(null);
    const resolved = await resolveTableByNumber(storeId, trimmed);
    if (!resolved) {
      setLoading(false);
      setError(t("mesaManualNotFound"));
      return;
    }

    setLoading(false);
    onManualConfirm(resolved.table_number, resolved.table_id);
    setManualNumber("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="max-h-[92dvh] max-w-[min(100vw-1.5rem,26rem)] gap-0 overflow-y-auto rounded-[32px] border-0 bg-background p-0 shadow-2xl sm:max-w-md">
        <div className="relative overflow-hidden rounded-t-[32px] bg-gradient-to-br from-primary/12 via-primary/5 to-background px-6 pb-5 pt-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <DialogHeader className="items-center space-y-3 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary text-primary-foreground shadow-[0_12px_28px_-10px_rgba(58,2,5,0.55)]">
              <UtensilsCrossed className="h-8 w-8" strokeWidth={1.8} />
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-card text-primary shadow-sm">
                <QrCode className="h-4 w-4" strokeWidth={2.2} />
              </span>
            </div>
            <DialogTitle className="text-[22px] font-black tracking-tight">{t("mesaDialogTitle")}</DialogTitle>
            <DialogDescription className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
              {t("mesaScanInstruction")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <div className="space-y-2">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-primary/80">
              {t("mesaQrScanLabel")}
            </p>
            <Suspense
              fallback={
                <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border-2 border-primary/25 bg-black/90 text-xs font-semibold text-white">
                  {t("mesaQrStarting")}
                </div>
              }
            >
              <MesaQrScanner active={open} onDetected={(raw) => void handleQrDetected(raw)} />
            </Suspense>
            {qrLoading ? (
              <p className="text-center text-xs font-medium text-muted-foreground">{t("mesaQrValidating")}</p>
            ) : null}
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center">
              <span className="rounded-full bg-background px-4 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {t("mesaOrManual")}
              </span>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-sm">
            <label className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Hash className="h-3.5 w-3.5 text-primary" />
              {t("tableNumber")}
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={manualNumber}
              onChange={(e) => {
                setManualNumber(e.target.value.replace(/\D/g, "").slice(0, 4));
                if (error) setError(null);
              }}
              placeholder="12"
              className="h-14 rounded-2xl border-2 border-border/50 bg-background text-center text-3xl font-black tabular-nums shadow-inner"
              autoComplete="off"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              className="h-12 w-full rounded-2xl text-base font-black shadow-primary"
              disabled={loading || !manualNumber.trim()}
              onClick={() => void handleManualConfirm()}
            >
              {loading ? t("loadingGeneric") : t("mesaManualContinue")}
            </Button>
            <Button type="button" variant="ghost" className="h-10 w-full rounded-2xl text-muted-foreground" onClick={resetAndClose}>
              {t("close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MesaSetupDialog;
