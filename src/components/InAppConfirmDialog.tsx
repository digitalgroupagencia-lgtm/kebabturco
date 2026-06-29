import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

/** Confirmação dentro do ecrã da app, não usa alertas nativos do navegador. */
export default function InAppConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = true,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center p-5 bg-black/45 backdrop-blur-[2px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="in-app-confirm-title"
      aria-describedby="in-app-confirm-desc"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[320px] rounded-[28px] border border-border bg-card p-5 shadow-elevated animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 id="in-app-confirm-title" className="text-base font-black text-foreground leading-snug">
              {title}
            </h2>
            <p id="in-app-confirm-desc" className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="w-full h-11 rounded-2xl font-black"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-2xl font-black"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
