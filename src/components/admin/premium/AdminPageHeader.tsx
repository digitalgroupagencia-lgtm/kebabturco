import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type Breadcrumb = { label: string; to?: string };

type Props = {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  backTo?: string;
  actions?: React.ReactNode;
  className?: string;
};

export default function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  backTo,
  actions,
  className,
}: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[11px] text-muted-foreground flex-wrap">
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

      <div className="flex items-start gap-2">
        {backTo && (
          <Link
            to={backTo}
            className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border bg-card hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-prose">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
