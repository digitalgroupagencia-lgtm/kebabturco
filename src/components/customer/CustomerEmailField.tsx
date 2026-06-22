import { Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  value: string;
  onChange: (value: string) => void;
  showError?: boolean;
  onClearError?: () => void;
  className?: string;
};

export default function CustomerEmailField({
  value,
  onChange,
  showError,
  onClearError,
  className = "",
}: Props) {
  const { t } = useLanguage();

  return (
    <div
      className={`px-3 py-2.5 border-t border-border ${showError ? "bg-destructive/5" : ""} ${className}`}
    >
      <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground mb-1">
        <Mail className="w-3 h-3 text-primary" />
        {t("receiptEmailLabel")}
      </label>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.slice(0, 120));
          if (showError) onClearError?.();
        }}
        placeholder={t("receiptEmailPlaceholder")}
        className="w-full h-10 px-3 text-sm font-medium bg-secondary/60 rounded-xl border-2 border-transparent focus:border-primary"
      />
      <p className="text-[10px] text-muted-foreground mt-1.5">{t("receiptEmailHint")}</p>
    </div>
  );
}
