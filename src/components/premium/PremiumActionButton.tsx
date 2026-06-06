import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PremiumActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost";
};

export function PremiumActionButton({
  className,
  tone = "primary",
  children,
  ...props
}: PremiumActionButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition active:scale-[0.98]",
        tone === "primary" && "bg-gradient-to-r from-[#8B0F1A] to-[#D62300] text-white",
        tone === "secondary" && "border border-white/10 bg-[#111111] text-white",
        tone === "ghost" && "border border-transparent bg-transparent text-zinc-300 hover:bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
