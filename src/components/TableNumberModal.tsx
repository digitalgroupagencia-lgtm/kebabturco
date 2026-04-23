import { useState } from "react";
import { Hash, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onConfirm: (table: string) => void;
  onCancel: () => void;
}

/**
 * Modal final para capturar o número da mesa logo após o pagamento.
 * Aparece somente quando "Comer aqui" foi escolhido e a mesa não foi informada.
 */
const TableNumberModal = ({ open, onConfirm, onCancel }: Props) => {
  const { t } = useLanguage();
  const [value, setValue] = useState("");

  if (!open) return null;

  const valid = value.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-t-[28px] sm:rounded-3xl shadow-2xl p-6 pb-[max(24px,env(safe-area-inset-bottom))] animate-slide-in-from-bottom">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Hash className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">
            {t("tableNumber")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
            {t("tableHint")}
          </p>
        </div>

        <input
          autoFocus
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="—"
          className="w-full h-20 mt-6 px-4 text-center text-5xl font-black text-foreground tabular-nums tracking-wider bg-secondary/60 rounded-2xl border-2 border-transparent focus:outline-none focus:border-primary focus:bg-card transition-colors"
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-black text-sm uppercase tracking-wide active:scale-[0.97] transition-transform"
          >
            {t("back")}
          </button>
          <button
            onClick={() => valid && onConfirm(value.trim())}
            disabled={!valid}
            className="flex-[1.4] h-14 rounded-2xl bg-gradient-cta text-success-foreground shadow-cta font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-40 disabled:active:scale-100 disabled:shadow-none"
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            {t("confirmOrder")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableNumberModal;