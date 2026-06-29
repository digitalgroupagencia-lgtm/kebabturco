import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CampaignPresetDefinition } from "@/lib/marketing/campaignPresets";
import { isMandatoryPreset } from "@/lib/marketing/campaignPresets";
import { pickLocalizedCampaignText, type MessageLocale } from "@/lib/marketing/campaignTemplateEngine";
import {
  updateMarketingCampaign,
  type MarketingCampaignRow,
} from "@/lib/marketing/marketingService";
import { useStaffT } from "@/hooks/useStaffT";
import { toast } from "sonner";

const WINE = "#3a0205";

type LangFields = { title: string; message: string };

function initialFields(
  campaign: MarketingCampaignRow,
  preset: CampaignPresetDefinition,
): Record<MessageLocale, LangFields> {
  const locales: MessageLocale[] = ["pt", "es", "en"];
  const lifecycle =
    preset.triggerEvent === "lifecycle_welcome" || preset.triggerEvent === "lifecycle_relation";
  const out = {} as Record<MessageLocale, LangFields>;
  for (const locale of locales) {
    const fromDb = pickLocalizedCampaignText(campaign, locale);
    const fromPreset = { title: preset.title[locale], body: preset.message[locale] };
    const title = fromDb.title && fromDb.title !== fromPreset.title ? fromDb.title : fromPreset.title;
    let message = fromDb.body;
    if (!message || message === fromPreset.body || isLifecyclePlaceholder(message)) {
      message = lifecycle ? "" : fromPreset.body;
    }
    out[locale] = { title, message };
  }
  return out;
}

function isLifecyclePlaceholder(body: string): boolean {
  const b = body.toLowerCase();
  return (
    b.includes("mensagens variadas") ||
    b.includes("mensajes variados") ||
    b.includes("varied welcome") ||
    b.includes("mantener el vínculo") ||
    b.includes("manter a ligação")
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: CampaignPresetDefinition;
  campaign: MarketingCampaignRow;
  onSaved: () => void;
};

export default function CampaignMessageEditDialog({
  open,
  onOpenChange,
  preset,
  campaign,
  onSaved,
}: Props) {
  const { t } = useStaffT();
  const lifecycle = preset.triggerEvent === "lifecycle_welcome" || preset.triggerEvent === "lifecycle_relation";
  const mandatory = isMandatoryPreset(preset.key);

  const [fields, setFields] = useState<Record<MessageLocale, LangFields>>(() =>
    initialFields(campaign, preset),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setFields(initialFields(campaign, preset));
  }, [open, campaign, preset]);

  const variablesHint = useMemo(
    () => preset.variables.map((v) => `{${v}}`).join(", "),
    [preset.variables],
  );

  const setLocale = (locale: MessageLocale, patch: Partial<LangFields>) => {
    setFields((prev) => ({ ...prev, [locale]: { ...prev[locale], ...patch } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateMarketingCampaign(campaign.id, {
        title_pt: fields.pt.title.trim(),
        title_es: fields.es.title.trim(),
        title_en: fields.en.title.trim(),
        message_pt: fields.pt.message.trim(),
        message_es: fields.es.message.trim(),
        message_en: fields.en.message.trim(),
        title: fields.es.title.trim(),
        message_template: fields.es.message.trim(),
      });
      if (!res.ok) {
        toast.error(res.error ?? t("common.error"));
        return;
      }
      toast.success(t("marketing.campaign.edit_saved"));
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const localeTab = (locale: MessageLocale, label: string) => (
    <TabsContent value={locale} className="space-y-3 mt-3">
      <div className="space-y-1.5">
        <Label>{t("marketing.broadcast.title_field")}</Label>
        <Input
          value={fields[locale].title}
          onChange={(e) => setLocale(locale, { title: e.target.value })}
          maxLength={60}
          disabled={lifecycle}
        />
        {lifecycle && (
          <p className="text-[10px] text-muted-foreground">{t("marketing.campaign.edit.lifecycle_title_hint")}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>
          {lifecycle ? t("marketing.campaign.edit.message_lifecycle") : t("marketing.broadcast.body_field")}
        </Label>
        <Textarea
          rows={4}
          value={fields[locale].message}
          onChange={(e) => setLocale(locale, { message: e.target.value })}
          maxLength={220}
        />
      </div>
    </TabsContent>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preset.name}</DialogTitle>
          <DialogDescription>
            {mandatory ? t("marketing.campaign.edit.desc_mandatory") : t("marketing.campaign.edit.desc_optional")}
          </DialogDescription>
        </DialogHeader>

        <p className="text-[11px] text-muted-foreground rounded-lg border bg-muted/30 p-2.5">
          {lifecycle ? t("marketing.campaign.edit.lifecycle_note") : t("marketing.campaign.edit.variables_note")}
          <span className="mt-1 block font-mono text-[10px]">{variablesHint}</span>
        </p>

        <Tabs defaultValue="es">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="es">ES</TabsTrigger>
            <TabsTrigger value="pt">PT</TabsTrigger>
            <TabsTrigger value="en">EN</TabsTrigger>
          </TabsList>
          {localeTab("es", "ES")}
          {localeTab("pt", "PT")}
          {localeTab("en", "EN")}
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" style={{ backgroundColor: WINE }} disabled={saving} onClick={() => void handleSave()}>
            {saving ? t("marketing.broadcast.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
