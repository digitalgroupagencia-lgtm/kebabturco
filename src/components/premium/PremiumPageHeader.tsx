import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PremiumPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  mode?: "dark" | "light";
  className?: string;
};

export function PremiumPageHeader({
  title,
  subtitle,
  actions,
  mode = "dark",
  className,
}: PremiumPageHeaderProps) {
  const isDark = mode === "dark";
  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-black tracking-tight lg:text-3xl">{title}</h1>
        {subtitle && (
          <p className={cn("mt-1 text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            {subtitle}
          </p>
        )}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
