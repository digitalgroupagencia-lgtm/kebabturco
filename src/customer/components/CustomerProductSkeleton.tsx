import { Skeleton } from "@/components/ui/skeleton";

const CustomerProductSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col bg-background" aria-busy="true" aria-label="A carregar produto">
    <div
      className="shrink-0 border-b border-border/50 bg-background px-4 pb-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-16 rounded" />
          <Skeleton className="h-5 w-40 max-w-full rounded" />
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-hidden px-4 py-4 space-y-5">
      <Skeleton className="aspect-[4/3] w-full max-w-md mx-auto rounded-3xl" />
      <Skeleton className="h-7 w-3/4 max-w-sm mx-auto rounded-lg" />
      <Skeleton className="h-4 w-full max-w-md mx-auto rounded" />
      <Skeleton className="h-4 w-[85%] max-w-md mx-auto rounded" />

      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-28 rounded" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-2xl" />
        ))}
      </div>

      <div className="pt-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);

export default CustomerProductSkeleton;
