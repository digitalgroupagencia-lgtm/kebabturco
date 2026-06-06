import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: PremiumEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center flex flex-col items-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      {(actionLabel || secondaryLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="h-9">
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button onClick={onSecondary} variant="outline" className="h-9">
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
