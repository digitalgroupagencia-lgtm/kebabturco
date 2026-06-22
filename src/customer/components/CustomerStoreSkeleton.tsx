import { Skeleton } from "@/components/ui/skeleton";

const CustomerStoreSkeleton = () => (
  <div
    className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background"
    style={{ paddingTop: "env(safe-area-inset-top)" }}
    aria-busy="true"
    aria-label="A carregar lojas"
  >
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none z-0"
      style={{
        height: "env(safe-area-inset-top)",
        background: "var(--browser-chrome-hex, #5C1419)",
      }}
    />
    <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>

    <div className="flex flex-col items-center px-6 pt-6 shrink-0">
      <Skeleton className="h-20 w-20 rounded-2xl" />
      <Skeleton className="mt-4 h-6 w-48 rounded-lg" />
      <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
    </div>

    <div className="flex-1 px-4 py-6 space-y-3 max-w-md mx-auto w-full">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);

export default CustomerStoreSkeleton;
