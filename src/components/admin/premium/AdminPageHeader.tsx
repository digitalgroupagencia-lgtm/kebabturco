import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; to?: string };

type Props = {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  backTo?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Ícone opcional renderizado num tile vermelho à esquerda do título. */
  icon?: LucideIcon;
};

export default function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  backTo,
  actions,
  className,
  icon: Icon,
}: Props) {
  return (
    <div className={cn("space-y-2 mb-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-primary font-medium transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-semibold">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start gap-3">
        {backTo && (
          <Link
            to={backTo}
            className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border bg-card hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        {Icon && (
          <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{title}</h1>
            {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-3xl">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
