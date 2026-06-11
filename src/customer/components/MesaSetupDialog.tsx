import { useState } from "react";
import { Camera, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
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

type MesaSetupDialogProps = {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onConfirm: (tableNumber: string, tableId: string) => void;
};

const MesaSetupDialog = ({ open, storeId, onClose, onConfirm }: MesaSetupDialogProps) => {
  const { t } = useLanguage();
  const [manualNumber, setManualNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setManualNumber("");
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
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
    const { data } = await supabase
      .from("tables")
      .select("id, number")
      .eq("store_id", storeId)
      .eq("number", trimmed)
      .eq("is_active", true)
      .maybeSingle();

    setLoading(false);
    if (!data) {
      setError(t("mesaManualNotFound"));
      return;
    }

    onConfirm(data.number, data.id);
    setManualNumber("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-sm rounded-[28px] border-border/40 p-6 sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <QrCode className="h-7 w-7 text-primary" strokeWidth={1.8} />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">{t("mesaDialogTitle")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{t("mesaScanInstruction")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 px-4 py-3">
          <Camera className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
          <p className="text-xs leading-relaxed text-muted-foreground">{t("mesaScanCameraHint")}</p>
        </div>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
            <span className="bg-background px-3 text-muted-foreground">{t("mesaOrManual")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
            className="h-12 text-center text-2xl font-black tabular-nums"
            autoComplete="off"
          />
          {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-base font-bold"
            disabled={loading || !manualNumber.trim()}
            onClick={() => void handleConfirm()}
          >
            {loading ? t("loadingGeneric") : t("mesaManualContinue")}
          </Button>
          <Button type="button" variant="ghost" className="h-10 w-full rounded-2xl" onClick={handleClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MesaSetupDialog;
