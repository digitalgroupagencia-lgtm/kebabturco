import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PremiumEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  mode?: "dark" | "light";
};

export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  mode = "dark",
}: PremiumEmptyStateProps) {
  const isDark = mode === "dark";

  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center",
        isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50",
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
          isDark ? "bg-[#D62300]/15 text-[#EF4444]" : "bg-[#D62300]/10 text-[#B91C1C]",
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h4 className="text-lg font-black">{title}</h4>
      <p className={cn("mt-2 max-w-md text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>
        {description}
      </p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-gradient-to-r from-[#8B0F1A] to-[#D62300] px-5 py-3 text-sm font-black text-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
