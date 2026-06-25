import { Truck, Gift, Sparkles, Heart, Sun, Star, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarketingSuggestionCard } from "@/lib/marketing/marketingSuggestions";
import type { CouponRow } from "@/lib/marketing/marketingCouponService";
import PushPreviewMockup from "@/components/marketing/PushPreviewMockup";
import { cn } from "@/lib/utils";

const ICONS = {
  truck: Truck,
  gift: Gift,
  sparkles: Sparkles,
  heart: Heart,
  sun: Sun,
  star: Star,
};

const WINE = "#3a0205";

type Props = {
  suggestion: MarketingSuggestionCard;
  lang: "pt" | "es" | "en";
  coupon?: CouponRow | null;
  couponValid?: boolean;
  busy?: boolean;
  onCreateCoupon: () => void;
  onActivateCampaign?: () => void;
  campaignActive?: boolean;
};

export default function MarketingSuggestionCard({
  suggestion,
  lang,
  coupon,
  couponValid,
  busy,
  onCreateCoupon,
  onActivateCampaign,
  campaignActive,
}: Props) {
  const Icon = ICONS[suggestion.icon] ?? Gift;
  const title = suggestion.title[lang];
  const subtitle = suggestion.subtitle[lang];
  const pushTitle = suggestion.pushTitle[lang];
  const pushBody = suggestion.pushBody[lang].replace("{cupao_codigo}", suggestion.coupon.code);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        suggestion.recommended && "ring-1 ring-[#3a0205]/20",
      )}
    >
      <div className={cn("bg-gradient-to-br p-4", suggestion.accent)}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow"
            style={{ backgroundColor: WINE }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-black">{title}</h3>
              {suggestion.recommended && (
                <Badge className="text-[9px]" style={{ backgroundColor: WINE }}>
                  Recomendado
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            <p className="mt-2 font-mono text-xs font-bold">{suggestion.coupon.code}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <PushPreviewMockup title={pushTitle} body={pushBody} />
        <div className="space-y-2.5 text-xs">
          {coupon?.is_active && couponValid ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Cupão <strong>{coupon.code}</strong> activo e validado no checkout.
              </span>
            </div>
          ) : coupon ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Cupão existe mas precisa de revisão ou activação.</span>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-2.5 text-muted-foreground">
              Crie o cupão para o cliente poder usar no pagamento.
            </div>
          )}

          <Button
            className="w-full h-9 font-bold text-xs"
            style={{ backgroundColor: WINE }}
            disabled={busy || (coupon?.is_active && couponValid)}
            onClick={onCreateCoupon}
          >
            {coupon?.is_active && couponValid ? "Cupão pronto" : `Criar cupão ${suggestion.coupon.code}`}
          </Button>

          {onActivateCampaign && (
            <Button
              variant="outline"
              className="w-full h-9 text-xs font-semibold"
              disabled={busy || !couponValid || campaignActive}
              onClick={onActivateCampaign}
            >
              {campaignActive ? "Campanha activa" : "Activar campanha push"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
