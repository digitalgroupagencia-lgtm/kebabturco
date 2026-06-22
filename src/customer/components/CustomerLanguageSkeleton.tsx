import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  languageCount?: number;
};

const CustomerLanguageSkeleton = ({ languageCount = 3 }: Props) => (
  <div
    className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background"
    style={{ paddingTop: "env(safe-area-inset-top)" }}
    aria-busy="true"
    aria-label="A carregar"
  >
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none z-0"
      style={{
        height: "env(safe-area-inset-top)",
        background: "var(--browser-chrome-hex, #3A0205)",
      }}
    />
    <div className="absolute right-4 z-10" style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>

    <div className="flex flex-col items-center px-6 pt-3 shrink-0">
      <Skeleton className="w-full max-w-[200px] aspect-square rounded-3xl" />
      <Skeleton className="mt-6 h-7 w-56 max-w-full rounded-lg" />
      <Skeleton className="mt-2 h-5 w-40 max-w-full rounded-lg" />
    </div>

    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 pb-24 w-full max-w-md mx-auto">
      {Array.from({ length: languageCount }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-2xl" />
      ))}
    </div>

    <div className="absolute bottom-4 left-0 right-0 px-6">
      <Skeleton className="mx-auto h-10 w-full max-w-xs rounded-full" />
    </div>
  </div>
);

export default CustomerLanguageSkeleton;
