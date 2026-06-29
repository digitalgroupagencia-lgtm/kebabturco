import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";
import type * as DialogPrimitive from "@radix-ui/react-dialog";

/** Evita teclado ao abrir — Radix foca o primeiro input (email) e o iOS abre o teclado. */
export const tapToPayDialogOpenFocusHandlers = {
  onOpenAutoFocus: (e: Event) => e.preventDefault(),
} satisfies Partial<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>;

/** Mobile-safe dialog shell for Tap to Pay flows (keyboard + safe area). */
export function tapToPayDialogContentClass(...extra: (string | undefined)[]) {
  return cn(
    "w-[calc(100vw-1rem)] sm:max-w-md",
    "max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-0.5rem)]",
    "sm:max-h-[min(90vh,640px)]",
    "overflow-y-auto overscroll-contain",
    "max-sm:fixed max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:translate-x-0 max-sm:translate-y-0",
    "max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:rounded-none max-sm:border-0",
    "pb-[max(1rem,env(safe-area-inset-bottom))]",
    ...extra,
  );
}

/** Bottom sheet no telemóvel — melhor para teclado numérico. */
export function staffMobileSheetClass(...extra: (string | undefined)[]) {
  return cn(
    "max-h-[min(92dvh,640px)]",
    "pb-[max(1rem,env(safe-area-inset-bottom))]",
    ...extra,
  );
}
