import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PremiumSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PremiumSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = "",
}: PremiumSectionProps) {
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-sm overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
