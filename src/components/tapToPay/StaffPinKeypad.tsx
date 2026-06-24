import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeStaffAccessPinInput } from "@/lib/staffAccessPin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "#", "0", "back"] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
};

export default function StaffPinKeypad({
  value,
  onChange,
  maxLength = 10,
  disabled = false,
  className,
}: Props) {
  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    onChange(sanitizeStaffAccessPinInput(value + key).slice(0, maxLength));
  };

  const slots = Math.max(4, Math.min(maxLength, value.length + 1));

  return (
    <div className={cn("select-none", className)}>
      <div
        className="flex items-center justify-center gap-2.5 py-3"
        aria-live="polite"
        aria-label={value.length ? `${value.length} digits entered` : "Enter your code"}
      >
        {Array.from({ length: slots }).map((_, index) => {
          const filled = index < value.length;
          const char = value[index];
          return (
            <div
              key={index}
              className={cn(
                "flex h-12 w-10 items-center justify-center rounded-xl border-2 text-xl font-bold font-mono transition-colors",
                filled
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-transparent",
              )}
            >
              {filled ? (char === "#" ? "#" : "•") : "•"}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            className={cn(
              "h-14 rounded-2xl border-2 border-border bg-card text-xl font-bold shadow-sm",
              "active:scale-[0.97] transition-transform touch-manipulation",
              "disabled:opacity-50 disabled:pointer-events-none",
              key === "back" && "text-muted-foreground",
            )}
            aria-label={key === "back" ? "Delete" : key}
          >
            {key === "back" ? <Delete className="mx-auto h-6 w-6" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
