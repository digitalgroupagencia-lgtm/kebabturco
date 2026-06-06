import { cn } from "@/lib/utils";

type Status =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "orange"
  | "purple";

const styles: Record<Status, string> = {
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  danger: "bg-red-500/10 text-red-500 border-red-500/20",
  info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  neutral: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function PremiumStatusBadge({
  children,
  status = "neutral",
  className,
}: {
  children: React.ReactNode;
  status?: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
        styles[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
