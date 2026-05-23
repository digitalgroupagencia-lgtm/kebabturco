import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PreviewVariant } from "@/lib/adminCentralPreviews";

type Props = {
  variants: PreviewVariant[];
  className?: string;
  bubble?: boolean;
};

export default function AdminPreviewTabs({ variants, className, bubble = true }: Props) {
  const [active, setActive] = useState(variants[0]?.id ?? "");
  const current = variants.find((v) => v.id === active) ?? variants[0];

  if (!current) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {variants.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v.id)}
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors",
                active === v.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:border-border",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "text-xs leading-relaxed animate-in fade-in duration-200",
          bubble
            ? "rounded-2xl rounded-bl-md bg-primary/10 border border-primary/15 px-3 py-2.5 text-foreground"
            : "rounded-xl bg-muted/40 border px-3 py-2.5 text-muted-foreground",
        )}
      >
        {current.content}
      </div>
    </div>
  );
}
