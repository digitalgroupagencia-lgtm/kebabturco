import { Skeleton } from "@/components/ui/skeleton";
import { shouldHideHeader } from "@/lib/embed-mode";

const CATEGORY_PLACEHOLDERS = 5;
const PRODUCT_PLACEHOLDERS = 6;

const CustomerHomeSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background" aria-busy="true" aria-label="A carregar o menu">
    {!shouldHideHeader() && (
        <header
          className="sticky top-0 z-30 shrink-0 bg-gradient-header px-4 pb-3 shadow-header rounded-b-[18px]"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
        >
          <div className="flex items-center justify-between gap-3 min-h-[48px]">
            <Skeleton className="h-11 w-36 max-w-[55%] rounded-lg bg-primary-foreground/25" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-full bg-primary-foreground/20" />
              <Skeleton className="h-8 w-8 rounded-full bg-primary-foreground/20" />
            </div>
          </div>
        </header>
    )}

    <div className="flex flex-1 overflow-hidden min-h-0">
      <aside className="w-[98px] min-w-[98px] shrink-0 border-r border-border/40 bg-secondary/30 px-2 py-2 space-y-2">
        {Array.from({ length: CATEGORY_PLACEHOLDERS }).map((_, index) => (
          <div key={index} className="rounded-xl bg-card/70 p-1.5 space-y-1.5">
            <Skeleton className="aspect-[5/4] w-full rounded-[10px]" />
            <Skeleton className="mx-auto h-2.5 w-[80%] rounded" />
          </div>
        ))}
      </aside>

      <main className="flex-1 min-h-0 overflow-hidden px-3 pt-2 space-y-3">
        <Skeleton className="h-[88px] w-full rounded-2xl" />
        <div className="space-y-2 px-1">
          <Skeleton className="h-2.5 w-14 rounded" />
          <Skeleton className="h-5 w-36 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 pb-16">
          {Array.from({ length: PRODUCT_PLACEHOLDERS }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/60 bg-card p-2.5 space-y-2">
              <Skeleton className="aspect-[5/4] w-full rounded-[14px]" />
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-[70%] rounded" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);

export default CustomerHomeSkeleton;
