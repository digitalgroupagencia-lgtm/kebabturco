import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShoppingBasket, X } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";

type Props = {
  open: boolean;
  merchantName?: string;
  amountEuro: number;
  orderNumber?: string | number;
  onClose: () => void;
};

function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" aria-hidden>
      <path
        d="M8 16c0-4.4 3.6-8 8-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M4 16c0-6.6 5.4-12 12-12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M0 16c0-8.8 7.2-16 16-16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="30" y="10" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M34 14h8M34 18h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SparkleField() {
  const dots = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    left: `${8 + ((i * 17) % 84)}%`,
    top: `${4 + ((i * 11) % 22)}%`,
    delay: `${(i % 7) * 0.35}s`,
    size: i % 3 === 0 ? 3 : 2,
  }));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-36 overflow-hidden" aria-hidden>
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full bg-sky-400/80 animate-tap-sparkle"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDelay: d.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function TapToPayAppleVisualScreen({
  open,
  merchantName = "Kebab Turco",
  amountEuro,
  orderNumber,
  onClose,
}: Props) {
  const { t } = useStaffT();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const payLabel = t("tapToPay.visual.pay_merchant").replace("{merchant}", merchantName);
  const formatted = `€${amountEuro.toFixed(2)}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex flex-col bg-black text-white select-none"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-modal="true"
      aria-label={t("tapToPay.visual.hold_here")}
    >
      <SparkleField />

      <div className="relative z-10 flex flex-col items-center px-6 pt-10 pb-6 text-center">
        <ContactlessIcon className="h-10 w-14 text-white mb-3" />
        <p className="text-[17px] font-medium tracking-tight">{t("tapToPay.visual.hold_here")}</p>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-[320px] rounded-[28px] bg-[#2c2c2e] px-6 py-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff9500]">
            <ShoppingBasket className="h-7 w-7 text-white" strokeWidth={2.2} />
          </div>
          <p className="text-[15px] font-medium text-white/90">{payLabel}</p>
          {orderNumber != null ? (
            <p className="mt-1 text-xs text-white/50">#{orderNumber}</p>
          ) : null}
          <p className="mt-3 text-[42px] font-semibold tabular-nums tracking-tight leading-none">
            {formatted}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-3 py-3 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300">
              {t("tapToPay.visual.demo_badge")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/90">{t("tapToPay.visual.demo_body")}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-10">
        <button
          type="button"
          onClick={onClose}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm active:scale-95 transition-transform"
          aria-label={t("tapToPay.cancel")}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <style>{`
        @keyframes tap-sparkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-tap-sparkle {
          animation: tap-sparkle 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>,
    document.body,
  );
}
