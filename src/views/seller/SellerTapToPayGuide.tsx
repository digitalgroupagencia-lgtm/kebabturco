import { Smartphone, CreditCard, CheckCircle2 } from "lucide-react";
import { useStaffT } from "@/hooks/useStaffT";

const STEPS = ["tapToPay.guide.step1", "tapToPay.guide.step2", "tapToPay.guide.step3", "tapToPay.guide.step4"] as const;

const BRANDS = ["Visa", "Mastercard", "American Express", "Discover", "Maestro", "V Pay"] as const;

export default function SellerTapToPayGuide() {
  const { t } = useStaffT();

  return (
    <div className="px-4 py-5 pb-8 max-w-lg mx-auto space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Smartphone className="h-5 w-5" />
          <h1 className="text-lg font-black">{t("tapToPay.guide.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("tapToPay.guide.intro")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("tapToPay.guide.how_title")}</p>
        <ol className="space-y-3">
          {STEPS.map((key, i) => (
            <li key={key} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">
                {i + 1}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <img
          src="/tap-to-pay/instruction-two-phones.png"
          alt=""
          className="w-full h-auto"
          loading="lazy"
        />
        <p className="px-4 py-3 text-xs text-muted-foreground leading-relaxed border-t border-border">
          {t("tapToPay.guide.caption_phones")}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <img
          src="/tap-to-pay/instruction-card-horizontal.png"
          alt=""
          className="w-full h-auto"
          loading="lazy"
        />
        <p className="px-4 py-3 text-xs text-muted-foreground leading-relaxed border-t border-border">
          {t("tapToPay.guide.caption_card")}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("tapToPay.guide.brands_title")}
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("tapToPay.guide.brands_desc")}</p>
        <div className="flex flex-wrap gap-2">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-semibold"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">{t("tapToPay.guide.confirm")}</p>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          {t("tapToPay.visual.demo_badge")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          {t("tapToPay.guide.demo_note")}
        </p>
      </div>
    </div>
  );
}
