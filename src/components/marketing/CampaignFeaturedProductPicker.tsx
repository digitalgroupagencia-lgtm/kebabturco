import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchMarketingProductOptions,
  type MarketingProductOption,
} from "@/lib/marketing/marketingProductPicker";
import { useStaffT } from "@/hooks/useStaffT";
import type { MessageLocale } from "@/lib/marketing/campaignTemplateEngine";

const AUTO_VALUE = "__auto__";

type Props = {
  storeId: string;
  locale: MessageLocale;
  value: string | null;
  onChange: (productId: string | null) => void;
};

export default function CampaignFeaturedProductPicker({ storeId, locale, value, onChange }: Props) {
  const { t } = useStaffT();
  const [options, setOptions] = useState<MarketingProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMarketingProductOptions(storeId, locale).then((rows) => {
      if (!cancelled) {
        setOptions(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storeId, locale]);

  const selected = useMemo(() => {
    if (!value) {
      const featured = options.find((o) => o.marketingFeatured);
      return featured ?? options[0] ?? null;
    }
    return options.find((o) => o.id === value) ?? null;
  }, [value, options]);

  const previewText = selected
    ? `${selected.label}${selected.priceLabel ? ` · ${selected.priceLabel}` : ""}${
        selected.categoryLabel ? ` · ${selected.categoryLabel}` : ""
      }`
    : "";

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div>
        <Label className="text-xs font-bold">{t("marketing.campaign.featured_product_label")}</Label>
        <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
          {t("marketing.campaign.featured_product_help")}
        </p>
      </div>
      <Select
        value={value ?? AUTO_VALUE}
        onValueChange={(v) => onChange(v === AUTO_VALUE ? null : v)}
        disabled={loading || options.length === 0}
      >
        <SelectTrigger className="h-10 text-xs">
          <SelectValue placeholder={loading ? "…" : t("marketing.campaign.featured_product_pick")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTO_VALUE} className="text-xs">
            {t("marketing.campaign.featured_product_auto")}
          </SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id} className="text-xs">
              {opt.label}
              {opt.marketingFeatured ? ` · ★` : ""}
              {opt.priceLabel ? ` (${opt.priceLabel})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {previewText && (
        <p className="text-[10px] text-muted-foreground">
          {t("marketing.campaign.featured_product_preview_prefix")} {previewText}
        </p>
      )}
      {!loading && options.length === 0 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300">
          {t("marketing.campaign.featured_product_empty")}
        </p>
      )}
    </div>
  );
}
