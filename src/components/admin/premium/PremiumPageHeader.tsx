import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PremiumPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  actions?: ReactNode;
}

export default function PremiumPageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
}: PremiumPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-4 mb-4 border-b border-border">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
