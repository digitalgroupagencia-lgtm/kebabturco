import { Bell, Gift, Package, Sparkles, type LucideIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type PushOptInCopy = {
  title: string;
  subtitle: string;
  benefitOrder: string;
  benefitPromo: string;
  benefitReady: string;
  activate: string;
  later: string;
};

type Props = {
  open: boolean;
  storeId: string;
  busy: boolean;
  copy: PushOptInCopy;
  onOpenChange: (open: boolean) => void;
  onActivate: () => void;
  onLater: () => void;
};

const BENEFIT_ICONS: LucideIcon[] = [Package, Gift, Sparkles];

const PushOptInDialogFrame = ({
  open,
  storeId,
  busy,
  copy,
  onOpenChange,
  onActivate,
  onLater,
}: Props) => {
  const benefits = [copy.benefitOrder, copy.benefitPromo, copy.benefitReady];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/75 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 outline-none overflow-hidden",
            "left-1/2 -translate-x-1/2",
            "top-[max(4.75rem,calc(env(safe-area-inset-top)+3.5rem))] sm:top-1/2 sm:-translate-y-1/2",
            "w-[calc(100%-1.5rem)] max-w-sm",
            "max-h-[min(86dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5rem))] sm:max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))]",
            "rounded-2xl sm:rounded-3xl border border-[#5a0a0e]/50 p-0 shadow-2xl",
            "bg-gradient-to-b from-[#3a0205] via-[#2a0104] to-[#1a0204] text-white",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="relative max-h-[inherit] overflow-y-auto overscroll-contain px-4 pt-5 pb-4 sm:px-6 sm:pt-8 sm:pb-6">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#6b1015]/30 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-6 bottom-12 h-24 w-24 rounded-full bg-[#8b1a20]/20 blur-xl"
              aria-hidden
            />

            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              onClick={onLater}
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
              <span className="sr-only">{copy.later}</span>
            </DialogPrimitive.Close>

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-3 sm:mb-5 flex h-14 w-14 sm:h-[72px] sm:w-[72px] items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
                <Bell className="h-7 w-7 sm:h-9 sm:w-9 text-white stroke-[1.5]" />
              </div>

              <DialogPrimitive.Title className="text-lg sm:text-[1.35rem] font-bold leading-snug tracking-tight text-white">
                {copy.title}
              </DialogPrimitive.Title>

              <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-white/75">
                {copy.subtitle}
              </DialogPrimitive.Description>

              <ul className="mt-4 sm:mt-5 w-full space-y-2 sm:space-y-2.5 text-left">
                {benefits.map((text, index) => {
                  const Icon = BENEFIT_ICONS[index] ?? Package;
                  return (
                    <li
                      key={text}
                      className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:px-3.5 sm:py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5a0a0e]/60">
                        <Icon className="h-4 w-4 text-white/90" strokeWidth={1.75} />
                      </span>
                      <span className="text-sm font-medium leading-snug text-white/90">{text}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                disabled={busy || !storeId}
                onClick={onActivate}
                className={cn(
                  "mt-4 sm:mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4",
                  "bg-white text-[#3a0205]",
                  "text-base font-bold shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition",
                  "hover:bg-white/95 active:scale-[0.98] disabled:opacity-60",
                )}
              >
                <Bell className="h-4 w-4 shrink-0" />
                {busy ? "…" : copy.activate}
              </button>

              <button
                type="button"
                onClick={onLater}
                className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white/55 transition hover:text-white/85"
              >
                {copy.later}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default PushOptInDialogFrame;
