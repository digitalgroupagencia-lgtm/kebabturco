import { Skeleton } from "@/components/ui/skeleton";

const CustomerSplashSkeleton = () => (
  <div
    className="flex h-full min-h-0 flex-col items-center justify-center bg-background px-6 relative overflow-hidden"
    aria-busy="true"
    aria-label="A carregar"
  >
    <div
      className="absolute inset-0 -z-10 opacity-[0.04]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--accent)) 0, transparent 40%)",
      }}
    />

    <div className="flex flex-col items-center min-h-[14rem] w-full max-w-xs">
      <Skeleton className="w-40 h-40 rounded-3xl" />
      <Skeleton className="mt-6 h-8 w-48 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-36 rounded-lg" />
    </div>

    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-secondary overflow-hidden">
      <div className="splash-shimmer absolute inset-0" />
    </div>

    <div className="absolute bottom-4 left-0 right-0 px-6">
      <Skeleton className="mx-auto h-10 w-full max-w-xs rounded-full" />
    </div>
  </div>
);

export default CustomerSplashSkeleton;
