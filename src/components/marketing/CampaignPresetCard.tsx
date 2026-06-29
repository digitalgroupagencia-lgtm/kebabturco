import { Clock, Gift, Heart, Megaphone, Smartphone, Sparkles, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { CampaignPresetDefinition } from "@/lib/marketing/campaignPresets";
import type { MarketingCampaignRow } from "@/lib/marketing/marketingService";
import { pickLocalizedCampaignText } from "@/lib/marketing/campaignTemplateEngine";
import { cn } from "@/lib/utils";
import PushPreviewMockup from "@/components/marketing/PushPreviewMockup";
import { useStaffT } from "@/hooks/useStaffT";

const ICONS = {
  welcome: Sparkles,
  winback: Heart,
  loyalty: Gift,
  promo: Megaphone,
  operational: Store,
  subscriber: Users,
};

const WINE = "#3a0205";

type Props = {
  preset: CampaignPresetDefinition;
  campaign?: MarketingCampaignRow | null;
  lang: "pt" | "es" | "en";
  onToggle?: (active: boolean) => void;
  onEdit?: () => void;
  onTestTeam?: () => void;
  toggling?: boolean;
  testingTeam?: boolean;
  showWinbackHint?: boolean;
  couponsHref?: string;
  couponCode?: string;
  couponReady?: boolean;
  mandatory?: boolean;
};

export default function CampaignPresetCard({
  preset,
  campaign,
  lang,
  onToggle,
  onEdit,
  onTestTeam,
  toggling,
  testingTeam,
  showWinbackHint,
  couponsHref,
  couponCode,
  couponReady,
  mandatory,
}: Props) {
  const { t } = useStaffT();
  const Icon = ICONS[preset.icon] ?? Megaphone;
  const active = campaign?.is_active ?? false;
  const localized = campaign ? pickLocalizedCampaignText(campaign, lang) : null;
  const title = localized?.title || preset.title[lang];
  const body = localized?.body || preset.message[lang];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        active && "ring-1 ring-[#3a0205]/30",
      )}
    >
      <div className={cn("bg-gradient-to-br p-4", preset.accent)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow"
              style={{ backgroundColor: WINE }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">{preset.name}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{preset.description}</p>
            </div>
          </div>
          {onToggle && (
            <Switch
              checked={active}
              disabled={toggling || (mandatory && active)}
              onCheckedChange={onToggle}
              aria-label="Activar campanha"
            />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px]">
            {preset.triggerEvent}
          </Badge>
          {preset.triggerDays != null && (
            <Badge variant="outline" className="text-[9px]">
              <Clock className="mr-0.5 h-3 w-3" />
              {preset.triggerDays}d
            </Badge>
          )}
          <Badge variant={active ? "default" : "secondary"} className="text-[9px]" style={active ? { backgroundColor: WINE } : undefined}>
            {mandatory ? "Obrigatória" : active ? "Activa" : "Pausada"}
          </Badge>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <PushPreviewMockup title={title} body={body} />
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-muted-foreground">Variáveis</p>
          <div className="flex flex-wrap gap-1">
            {preset.variables.map((v) => (
              <code key={v} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {`{${v}}`}
              </code>
            ))}
          </div>
          {(showWinbackHint || preset.suggestCoupon) && preset.suggestCoupon && (
            <div
              className={cn(
                "rounded-xl border p-2.5 text-[11px]",
                couponReady
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
              )}
            >
              {couponReady ? (
                <>
                  Cupão <strong>{preset.suggestCoupon}</strong> activo, validado no checkout.
                </>
              ) : (
                <>
                  Ao activar, criamos e validamos o cupão <strong>{preset.suggestCoupon}</strong> automaticamente.
                  {couponsHref && (
                    <Button variant="link" className="h-auto p-0 pl-1 text-[11px] font-bold" style={{ color: WINE }} asChild>
                      <a href={couponsHref}>Ver cupões →</a>
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          {onEdit && campaign && (
            <Button variant="outline" size="sm" className="h-8 w-full text-xs" onClick={onEdit}>
              {t("marketing.campaign.edit_button")}
            </Button>
          )}
          {onTestTeam && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full text-xs"
              disabled={testingTeam}
              onClick={onTestTeam}
            >
              <Smartphone className="mr-1 h-3.5 w-3.5" />
              {testingTeam ? "A enviar…" : "Testar na equipa"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
