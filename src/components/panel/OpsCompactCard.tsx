import { ChevronDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OpsCompactCardProps {
  title: string;
  summary: string;
  meta?: string;
  badges?: string[];
  inactive?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** When false, hides the Editar button (list-only rows). */
  editable?: boolean;
}

const OpsCompactCard = ({
  title,
  summary,
  meta,
  badges = [],
  inactive,
  isEditing,
  onEdit,
  onCancel,
  actions,
  children,
  editable = true,
}: OpsCompactCardProps) => (
  <div
    className={cn(
      "rounded-2xl border bg-card overflow-hidden transition-shadow",
      isEditing ? "border-primary/40 shadow-md ring-1 ring-primary/10" : "border-border shadow-sm",
      inactive && !isEditing && "opacity-60",
    )}
  >
    {!isEditing ? (
      <div className="flex items-start gap-2 p-3.5 sm:p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-foreground truncate">{title}</p>
            {badges.map((b) => (
              <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-semibold">
                {b}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{summary}</p>
          {meta && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{meta}</p>}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {actions}
          {editable && onEdit && (
            <Button type="button" variant="ghost" size="sm" className="h-9 px-2.5 font-semibold" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </div>
    ) : (
      <div className="p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm flex items-center gap-1">
            <ChevronDown className="h-4 w-4 text-primary" />
            A editar: {title}
          </p>
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
        {children}
      </div>
    )}
  </div>
);

export default OpsCompactCard;
