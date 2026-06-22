import { cn } from "@/lib/utils";

/** Mobile-safe dialog shell for Tap to Pay flows (keyboard + safe area). */
export function tapToPayDialogContentClass(...extra: (string | undefined)[]) {
  return cn(
    "w-[calc(100vw-1rem)] sm:max-w-md",
    "max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-0.5rem)]",
    "sm:max-h-[min(90vh,640px)]",
    "overflow-y-auto overscroll-contain",
    "max-sm:top-[max(0.5rem,env(safe-area-inset-top))] max-sm:translate-y-0",
    "pb-[max(1rem,env(safe-area-inset-bottom))]",
    ...extra,
  );
}
