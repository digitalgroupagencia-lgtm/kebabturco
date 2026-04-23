import { useEffect, useState } from "react";
import { Hash, Check, User, Phone, Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  /** "here" => pede nome + mesa | "takeaway" => pede nome + telefone */
  mode: "here" | "takeaway";
  initialName?: string;
  initialTable?: string;
  initialPhone?: string;
  onConfirm: (data: { name: string; table: string; phone: string }) => void;
  onCancel: () => void;
}

/**
 * Modal final que coleta nome + (mesa | telefone) logo após o pagamento.
 * Substitui a coleta no Review e o antigo TableNumberModal.
 */
const FinalizeOrderModal = ({
  open,
  mode,
  initialName = "",
  initialTable = "",
  initialPhone = "",
  onConfirm,
  onCancel,
}: Props) => {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName);
  const [table, setTable] = useState(initialTable);
  const [phone, setPhone] = useState(initialPhone);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setTable(initialTable);
      setPhone(initialPhone);
    }
  }, [open, initialName, initialTable, initialPhone]);

  if (!open) return null;

  const nameOk = name.trim().length >= 2;
  const secondOk = mode === "here" ? table.trim().length > 0 : phone.trim().length >= 6;
  const valid = nameOk && secondOk;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card rounded-t-[28px] sm:rounded-3xl shadow-2xl p-6 pb-[max(24px,env(safe-area-inset-bottom))] animate-slide-in-from-bottom">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Send className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">
            {t("finalizeOrder")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
            {t("finalizeHint")}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              {t("yourName")} <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="—"
              className="w-full h-14 px-4 text-lg font-bold text-foreground bg-secondary/60 rounded-2xl border-2 border-transparent focus:outline-none focus:border-primary focus:bg-card transition-colors"
            />
          </div>

          {mode === "here" ? (
            <div>
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                {t("tableNumber")} <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={table}
                onChange={(e) => setTable(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="—"
                className="w-full h-16 px-4 text-center text-3xl font-black text-foreground tabular-nums tracking-wider bg-secondary/60 rounded-2xl border-2 border-transparent focus:outline-none focus:border-primary focus:bg-card transition-colors"
              />
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-muted-foreground mb-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                {t("yourPhone")} <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20))}
                placeholder="+34 600 000 000"
                className="w-full h-14 px-4 text-base font-bold text-foreground tabular-nums bg-secondary/60 rounded-2xl border-2 border-transparent focus:outline-none focus:border-primary focus:bg-card transition-colors"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 h-14 rounded-2xl bg-secondary text-foreground font-black text-sm uppercase tracking-wide active:scale-[0.97] transition-transform"
          >
            {t("back")}
          </button>
          <button
            onClick={() =>
              valid &&
              onConfirm({
                name: name.trim(),
                table: table.trim(),
                phone: phone.trim(),
              })
            }
            disabled={!valid}
            className="flex-[1.4] h-14 rounded-2xl bg-gradient-cta text-success-foreground shadow-cta font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-40 disabled:active:scale-100 disabled:shadow-none"
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            {t("send")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalizeOrderModal;