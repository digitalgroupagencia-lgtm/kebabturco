import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PremiumCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  mode?: "dark" | "light";
  className?: string;
};

export function PremiumCard({
  title,
  subtitle,
  action,
  children,
  mode = "dark",
  className,
}: PremiumCardProps) {
  const isDark = mode === "dark";

  return (
    <section
      className={cn(
        "rounded-2xl border p-5",
        isDark
          ? "border-white/10 bg-[#111111] text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
          : "border-slate-200 bg-white text-slate-950 shadow-[0_16px_50px_rgba(17,24,39,0.06)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-black tracking-tight">{title}</h3>}
            {subtitle && (
              <p className={cn("mt-1 text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
