import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  body: string;
  storeName?: string;
  className?: string;
};

const WINE = "#3a0205";

export default function PushPreviewMockup({ title, body, storeName = "Kebab Turco", className }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-[280px]", className)}>
      <div className="rounded-[1.4rem] border border-black/10 bg-gradient-to-b from-neutral-100 to-neutral-200 p-3 shadow-lg dark:from-neutral-900 dark:to-neutral-950">
        <div className="mb-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-1 w-8 rounded-full bg-black/20" />
        </div>
        <div className="rounded-2xl border bg-white/95 p-3 shadow-sm backdrop-blur dark:bg-neutral-900/95">
          <div className="flex gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: WINE }}
            >
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-semibold" style={{ color: WINE }}>
                  {storeName}
                </p>
                <span className="shrink-0 text-[9px] text-muted-foreground">agora</span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs font-bold text-foreground">{title || "Título"}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {body || "Mensagem da campanha…"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
