import SmartImage from "@/components/SmartImage";
import { Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReviewCartItemCardProps = {
  name: string;
  priceLabel: string;
  imageUrl?: string | null;
  description?: string | null;
  layout: "single" | "multi";
  editLabel: string;
  removeLabel: string;
  onEdit: () => void;
  onRemove: () => void;
  editAriaLabel?: string;
  removeAriaLabel?: string;
  priorityImage?: boolean;
};

export default function ReviewCartItemCard({
  name,
  priceLabel,
  imageUrl,
  description,
  layout,
  editLabel,
  removeLabel,
  onEdit,
  onRemove,
  editAriaLabel,
  removeAriaLabel,
  priorityImage = false,
}: ReviewCartItemCardProps) {
  const isSingle = layout === "single";
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-card",
        isSingle ? "rounded-[28px]" : undefined,
      )}
    >
      <div
        className={cn(
          "grid gap-3 p-3",
          isSingle
            ? "min-h-[200px] grid-cols-[minmax(42%,0.95fr)_minmax(0,1.05fr)] gap-3.5 p-3.5 max-[360px]:grid-cols-[40%_1fr]"
            : "min-h-[168px] grid-cols-[42%_1fr] gap-3.5 max-[360px]:grid-cols-[40%_1fr]",
        )}
      >
        {hasImage ? (
          <div
            className={cn(
              "relative h-full min-h-[140px] w-full overflow-hidden rounded-[20px] bg-black",
              isSingle ? "min-h-[180px] rounded-[22px]" : undefined,
            )}
          >
            <SmartImage
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
              targetWidth={isSingle ? 560 : 420}
              priority={priorityImage}
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex h-full min-h-[140px] w-full items-center justify-center rounded-[20px] bg-muted",
              isSingle ? "min-h-[180px] rounded-[22px]" : undefined,
            )}
          >
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/55" aria-hidden />
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "min-w-0 font-black uppercase leading-tight tracking-wide text-foreground",
                isSingle ? "text-[17px] line-clamp-3" : "text-[15px] line-clamp-2",
              )}
            >
              {name}
            </h3>
            <span
              className={cn(
                "shrink-0 font-black tabular-nums text-price",
                isSingle ? "text-[18px]" : "text-[16px]",
              )}
            >
              {priceLabel}
            </span>
          </div>

          <div className="my-2.5 h-px w-full bg-border/70" aria-hidden />

          {description ? (
            <p
              className={cn(
                "text-[12px] leading-snug text-muted-foreground",
                isSingle ? "line-clamp-4" : "line-clamp-3",
              )}
            >
              {description}
            </p>
          ) : (
            <div className="flex-1" aria-hidden />
          )}

          <div className="mt-auto flex items-center justify-end gap-1 pt-3">
            <button
              type="button"
              onClick={onEdit}
              aria-label={editAriaLabel || editLabel}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-black text-primary transition-all hover:bg-primary/5 active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {editLabel}
            </button>
            <span className="h-4 w-px bg-border" aria-hidden />
            <button
              type="button"
              onClick={onRemove}
              aria-label={removeAriaLabel || removeLabel}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-black text-primary transition-all hover:bg-primary/5 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {removeLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
