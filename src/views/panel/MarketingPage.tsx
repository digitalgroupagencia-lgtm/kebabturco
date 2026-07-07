import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  History,
  Lightbulb,
  Megaphone,
  Radio,
  Send,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useStaffT } from "@/hooks/useStaffT";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { isGeneralAdmin } from "@/lib/projectAccess";
import { panelT } from "@/lib/staffPanelLocale";
import { useTenantFeatureFlags } from "@/hooks/usePlatformFeatures";
import { isTenantFeatureEnabled, normalizePlan } from "@/lib/platformFeatureGates";
import { nav } from "@/lib/navPaths";
import { CAMPAIGN_PRESETS, getPresetByKey, isMandatoryPreset, isWinbackPreset, presetNeedsCoupon } from "@/lib/marketing/campaignPresets";
import { getCouponSuggestion, getCouponSuggestionForPreset } from "@/lib/marketing/couponSuggestions";
import { MARKETING_SUGGESTIONS } from "@/lib/marketing/marketingSuggestions";
import {
  ensureCampaignCoupon,
  fetchCouponByCode,
  fetchFeaturedProductId,
  verifyCouponInSystem,
  createCouponFromSuggestion,
  type CouponRow,
} from "@/lib/marketing/marketingCouponService";
import CampaignMessageEditDialog from "@/components/marketing/CampaignMessageEditDialog";
import {
  resolveCampaignMessage,
  pickLocalizedCampaignText,
  type MessageLocale,
} from "@/lib/marketing/campaignTemplateEngine";
import {
  countActiveCampaigns,
  countMarketingSubscribers,
  fetchCampaignSendHistory,
  fetchMarketingCampaigns,
  fetchTenantMarketingSettings,
  installMarketingPresets,
  toggleMarketingCampaign,
  type MarketingCampaignRow,
  type CampaignSendLogEntry,
} from "@/lib/marketing/marketingService";
import { sendMarketingBroadcast } from "@/lib/diagnostics/campaignPushService";
import { sendBroadcastTestPushNotification } from "@/lib/push/pushTestService";
import CampaignPresetCard from "@/components/marketing/CampaignPresetCard";
import MarketingSuggestionCard from "@/components/marketing/MarketingSuggestionCard";
import PushPreviewMockup from "@/components/marketing/PushPreviewMockup";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { STORE_DEFAULTS } from "@/lib/storeHours";

const WINE = "#3a0205";

const MarketingPage = () => {
  const { t, lang } = useStaffT();
  const uiLang = (lang === "pt" || lang === "en" ? lang : "es") as MessageLocale;
  const { storeId } = useAdminStoreId();
  const { user } = useAuth();
  const { roleData } = useUserRole(user?.id);
  const { tenant } = useSelectedTenant();
  const isPlatformAdmin = isGeneralAdmin(roleData?.role);
  const tenantId = tenant?.id ?? roleData?.tenant_id ?? "";
  const [tenantPlan, setTenantPlan] = useState<ReturnType<typeof normalizePlan>>(() =>
    normalizePlan(tenant?.plan),
  );
  const { data: flags } = useTenantFeatureFlags(tenantId);

  const campaignsEnabled = isTenantFeatureEnabled("campaigns", tenantPlan, {
    platformAdmin: isPlatformAdmin,
    featureFlags: flags,
  });

  const [campaigns, setCampaigns] = useState<MarketingCampaignRow[]>([]);
  const [history, setHistory] = useState<CampaignSendLogEntry[]>([]);
  const [subscribers, setSubscribers] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [storeName, setStoreName] = useState("Restaurante");
  const [marketingOk, setMarketingOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [winbackHintKeys, setWinbackHintKeys] = useState<Set<string>>(new Set());
  const [couponByCode, setCouponByCode] = useState<Record<string, CouponRow | null>>({});
  const [couponValidByCode, setCouponValidByCode] = useState<Record<string, boolean>>({});
  const [suggestionBusy, setSuggestionBusy] = useState<string | null>(null);

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastTestSending, setBroadcastTestSending] = useState(false);
  const [campaignTestId, setCampaignTestId] = useState<string | null>(null);
  const [editCampaign, setEditCampaign] = useState<{
    preset: (typeof CAMPAIGN_PRESETS)[number];
    campaign: MarketingCampaignRow;
  } | null>(null);

  const [historyFilter, setHistoryFilter] = useState<"all" | "sent" | "failed" | "skipped">("all");
  const [activeTab, setActiveTab] = useState("home");

  const MANDATORY_PRESETS = useMemo(
    () => new Set(CAMPAIGN_PRESETS.filter((p) => isMandatoryPreset(p.key)).map((p) => p.key)),
    [],
  );

  const refreshQuiet = useCallback(async () => {
    if (!storeId || !tenantId) return;
    try {
      const [{ data: store }, camps, subs, active, hist] = await Promise.all([
        supabase.from("stores").select("name").eq("id", storeId).maybeSingle(),
        fetchMarketingCampaigns(storeId),
        countMarketingSubscribers(storeId),
        countActiveCampaigns(storeId),
        fetchCampaignSendHistory(storeId, 100),
      ]);
      setStoreName(store?.name ?? "Restaurante");
      setCampaigns(camps);
      setSubscribers(subs);
      setActiveCount(active);
      setHistory(hist);
    } catch {
      /* keep current UI */
    }
  }, [storeId, tenantId]);

  const load = useCallback(async () => {
    if (!storeId || !tenantId) return;
    setLoading(true);
    try {
      const settings = await fetchTenantMarketingSettings(tenantId);
      if (!settings?.presets_installed) {
        await installMarketingPresets(storeId);
      }

      const [{ data: store }, camps, subs, active, hist, tenantRow] = await Promise.all([
        supabase.from("stores").select("name").eq("id", storeId).maybeSingle(),
        fetchMarketingCampaigns(storeId),
        countMarketingSubscribers(storeId),
        countActiveCampaigns(storeId),
        fetchCampaignSendHistory(storeId, 100),
        supabase.from("tenants").select("plan").eq("id", tenantId).maybeSingle(),
      ]);

      setTenantPlan(normalizePlan(tenantRow.data?.plan));

      setStoreName(store?.name ?? "Restaurante");
      setCampaigns(camps);
      setSubscribers(subs);
      setActiveCount(active);
      setHistory(hist);
      setMarketingOk(settings?.push_enabled !== false && settings?.manual_broadcast_enabled !== false);

      const codes = new Set<string>();
      for (const p of CAMPAIGN_PRESETS) {
        if (p.suggestCoupon) codes.add(p.suggestCoupon);
      }
      for (const s of MARKETING_SUGGESTIONS) codes.add(s.coupon.code);
      const couponMap: Record<string, CouponRow | null> = {};
      const validMap: Record<string, boolean> = {};
      await Promise.all(
        [...codes].map(async (code) => {
          const row = await fetchCouponByCode(storeId, code);
          couponMap[code] = row;
          if (row?.is_active) {
            const tpl = getCouponSuggestion(code);
            const v = await verifyCouponInSystem(
              storeId,
              code,
              tpl?.minOrder && tpl.minOrder > 0 ? tpl.minOrder : 25,
              tpl?.discountType === "free_delivery" ? 3.5 : 0,
            );
            validMap[code] = v.ok;
          } else {
            validMap[code] = false;
          }
        }),
      );
      setCouponByCode(couponMap);
      setCouponValidByCode(validMap);
    } finally {
      setLoading(false);
    }
  }, [storeId, tenantId]);

  useEffect(() => {
    if (tenant?.plan) {
      setTenantPlan(normalizePlan(tenant.plan));
    }
  }, [tenant?.plan]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBroadcastTitle(t("marketing.broadcast.default_title"));
    setBroadcastBody(t("marketing.broadcast.default_body"));
  }, [t]);

  const campaignByPreset = useMemo(() => {
    const map = new Map<string, MarketingCampaignRow>();
    for (const c of campaigns) {
      if (c.preset_key) map.set(c.preset_key, c);
    }
    return map;
  }, [campaigns]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return history;
    return history.filter((h) => h.status === historyFilter);
  }, [history, historyFilter]);

  const handleToggle = async (presetKey: string, campaign: MarketingCampaignRow | undefined, next: boolean) => {
    if (!campaign || !storeId) return;

    if (!next && MANDATORY_PRESETS.has(presetKey)) {
      toast.error(t("marketing.campaign.mandatory"));
      return;
    }

    if (next && presetNeedsCoupon(presetKey)) {
      const preset = getPresetByKey(presetKey);
      const template =
        getCouponSuggestionForPreset(presetKey) ||
        (preset?.suggestCoupon ? getCouponSuggestion(preset.suggestCoupon) : undefined);
      if (template) {
        setTogglingId(campaign.id);
        const featured =
          template.discountType === "combo_nth" ? await fetchFeaturedProductId(storeId) : null;
        const ensured = await ensureCampaignCoupon(storeId, campaign.id, template, featured);
        setTogglingId(null);
        if (!ensured.ok) {
          toast.error(ensured.error ?? t("marketing.coupon.required"));
          return;
        }
        if (ensured.created) {
          toast.success(panelT(lang, "marketing.coupon.created", { code: template.code }));
        }
      }
    }

    setTogglingId(campaign.id);
    const res = await toggleMarketingCampaign(campaign.id, next);
    setTogglingId(null);
    if (!res.ok) {
      toast.error(res.error ?? t("common.error"));
      return;
    }
    if (next && isWinbackPreset(presetKey)) {
      setWinbackHintKeys((prev) => new Set(prev).add(presetKey));
    }
    toast.success(next ? t("marketing.toast.activated") : t("marketing.toast.paused"));
    void refreshQuiet();
  };

  const handleCreateSuggestionCoupon = async (suggestionId: string, code: string) => {
    if (!storeId) return;
    const suggestion = MARKETING_SUGGESTIONS.find((s) => s.id === suggestionId);
    const template = suggestion?.coupon ?? getCouponSuggestion(code);
    if (!template) return;
    setSuggestionBusy(suggestionId);
    try {
      const featured =
        template.discountType === "combo_nth" ? await fetchFeaturedProductId(storeId) : null;
      const created = await createCouponFromSuggestion(storeId, template, featured);
      if (!created.ok) {
        toast.error(created.error ?? t("marketing.coupon.error"));
        return;
      }
      const campaign = suggestion?.linkedPresetKey
        ? campaignByPreset.get(suggestion.linkedPresetKey)
        : undefined;
      if (campaign && created.couponId) {
        await supabase
          .from("marketing_campaigns")
          .update({ linked_coupon_id: created.couponId })
          .eq("id", campaign.id);
      }
      toast.success(panelT(lang, "marketing.coupon.created", { code: template.code }));
      void load();
    } finally {
      setSuggestionBusy(null);
    }
  };

  const handleActivateSuggestionCampaign = async (linkedPresetKey: string, couponCode: string) => {
    const campaign = campaignByPreset.get(linkedPresetKey);
    if (!campaign) {
      toast.error(t("marketing.suggestions.no_campaign"));
      return;
    }
    if (!couponValidByCode[couponCode]) {
      toast.error(t("marketing.coupon.required"));
      return;
    }
    await handleToggle(linkedPresetKey, campaign, true);
  };

  const handleBroadcast = async () => {
    if (!storeId) return;
    if (!marketingActive || !campaignsEnabled) {
      toast.error(t("marketing.broadcast.disabled"));
      return;
    }
    setBroadcastSending(true);
    try {
      const title = broadcastTitle.trim();
      const body = broadcastBody.trim();
      const [marketingRes, staffRes] = await Promise.all([
        sendMarketingBroadcast({ storeId, title, body, target: "all" }),
        sendBroadcastTestPushNotification({ storeId, audience: "staff", title, body }),
      ]);

      const customers = marketingRes.sent ?? 0;
      const staff = staffRes.sent ?? 0;
      const total = customers + staff;

      if (total === 0) {
        toast.error(
          marketingRes.userMessage ?? staffRes.userMessage ?? t("marketing.broadcast.none"),
        );
        return;
      }

      toast.success(
        panelT(lang, "marketing.broadcast.sent_breakdown", {
          count: String(total),
          customers: String(customers),
          staff: String(staff),
        }),
      );
      void refreshQuiet();
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleBroadcastTestTeam = async () => {
    if (!storeId) return;
    setBroadcastTestSending(true);
    try {
      const res = await sendBroadcastTestPushNotification({
        storeId,
        audience: "staff",
        title: `[TESTE] ${previewTitle}`,
        body: previewBody,
      });
      if (!res.ok) {
        toast.error(res.userMessage ?? res.error ?? t("marketing.broadcast.test_team_error"));
        return;
      }
      toast.success(res.userMessage ?? t("marketing.broadcast.test_team_sent"));
    } finally {
      setBroadcastTestSending(false);
    }
  };

  const previewCtx = useMemo(
    () => ({
      storeName,
      customerName: "Maria",
      locale: uiLang,
      weeklySchedule: STORE_DEFAULTS,
      timezone: "Europe/Madrid",
      featuredProductName: "Kebab Mixto",
      featuredProductPrice: "8,50 €",
      menuUrl: "/",
    }),
    [storeName, uiLang],
  );

  const handleCampaignTestTeam = async (presetKey: string, campaign: MarketingCampaignRow) => {
    if (!storeId) return;
    setCampaignTestId(campaign.id);
    try {
      const preset = getPresetByKey(presetKey);
      const localized = pickLocalizedCampaignText(campaign, uiLang);
      const rawTitle = localized.title || preset?.title[uiLang] || campaign.title || "";
      const rawBody = localized.body || preset?.message[uiLang] || campaign.message_template || "";
      const title = resolveCampaignMessage(rawTitle, previewCtx);
      const body = resolveCampaignMessage(rawBody, previewCtx);

      const res = await sendBroadcastTestPushNotification({
        storeId,
        audience: "staff",
        title: `[TESTE] ${title}`,
        body,
      });
      if (!res.ok) {
        toast.error(res.userMessage ?? res.error ?? t("marketing.broadcast.test_team_error"));
        return;
      }
      toast.success(res.userMessage ?? t("marketing.broadcast.test_team_sent"));
    } finally {
      setCampaignTestId(null);
    }
  };

  if (!storeId) {
    return <div className="p-6 text-sm text-muted-foreground">{t("common.no_store")}</div>;
  }

  if (!campaignsEnabled) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-3">
        <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("marketing.gated")}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">{t("ops.loading.orders")}</div>;
  }

  const marketingActive = marketingOk || isPlatformAdmin;

  if (!marketingActive) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center space-y-3">
        <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("marketing.broadcast.disabled")}</p>
      </div>
    );
  }

  const previewTitle = resolveCampaignMessage(broadcastTitle, previewCtx);
  const previewBody = resolveCampaignMessage(broadcastBody, previewCtx);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <HowToUsePanel
        purpose={t("howto.marketing.purpose")}
        whenToUse={t("howto.marketing.when")}
        steps={[
          t("howto.marketing.step1"),
          t("howto.marketing.step2"),
          t("howto.marketing.step3"),
          t("howto.marketing.step4"),
        ]}
        howToConfirm={t("howto.marketing.confirm")}
        assistantQuestion={t("howto.marketing.assistant")}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: WINE }}>
            <Megaphone className="h-5 w-5" />
            {t("page.marketing.title")}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{t("marketing.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={() => void load()} disabled={loading}>
          {t("common.refresh")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="home" className="text-xs gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            {t("marketing.tab.home")}
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs gap-1">
            <Lightbulb className="h-3.5 w-3.5" />
            {t("marketing.tab.suggestions")}
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {t("marketing.tab.campaigns")}
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs gap-1">
            <Send className="h-3.5 w-3.5" />
            {t("marketing.tab.broadcast")}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <History className="h-3.5 w-3.5" />
            {t("marketing.tab.history")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="space-y-3 mt-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t("marketing.stat.subscribers"), value: subscribers, icon: Radio },
              { label: t("marketing.stat.active"), value: activeCount, icon: Megaphone },
              {
                label: t("marketing.stat.sent_week"),
                value: history.filter((h) => h.status === "sent").slice(0, 20).length,
                icon: Send,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border bg-card p-3 shadow-sm">
                <Icon className="h-4 w-4 mb-1" style={{ color: WINE }} />
                <p className="text-2xl font-black">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4 text-xs text-muted-foreground">
            <p>{t("marketing.home.hint")}</p>
            <p className="mt-2">{t("marketing.home.antispam")}</p>
          </div>
          {history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">{t("marketing.home.recent")}</h3>
              {history.slice(0, 5).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs">
                  <span className="truncate font-mono">{row.customer_phone}</span>
                  <Badge variant={row.status === "sent" ? "default" : "secondary"} className="text-[9px]">
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground">{t("marketing.suggestions.hint")}</p>
          {MARKETING_SUGGESTIONS.map((s) => {
            const code = s.coupon.code;
            const linked = s.linkedPresetKey ? campaignByPreset.get(s.linkedPresetKey) : undefined;
            return (
              <MarketingSuggestionCard
                key={s.id}
                suggestion={s}
                lang={uiLang}
                coupon={couponByCode[code]}
                couponValid={couponValidByCode[code]}
                busy={suggestionBusy === s.id}
                onCreateCoupon={() => void handleCreateSuggestionCoupon(s.id, code)}
                onActivateCampaign={
                  s.linkedPresetKey
                    ? () => void handleActivateSuggestionCampaign(s.linkedPresetKey!, code)
                    : undefined
                }
                campaignActive={linked?.is_active}
              />
            );
          })}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">{t("marketing.campaigns.hint")}</p>

          <div className="space-y-3">
            <h3 className="text-sm font-bold" style={{ color: WINE }}>
              {t("marketing.campaigns.mandatory_section")}
            </h3>
            {CAMPAIGN_PRESETS.filter((p) => isMandatoryPreset(p.key)).map((preset) => {
              const row = campaignByPreset.get(preset.key);
              return (
                <CampaignPresetCard
                  key={preset.key}
                  preset={preset}
                  campaign={row}
                  lang={uiLang}
                  toggling={togglingId === row?.id}
                  testingTeam={campaignTestId === row?.id}
                  showWinbackHint={winbackHintKeys.has(preset.key)}
                  couponsHref={nav.admin("coupons")}
                  couponCode={preset.suggestCoupon}
                  couponReady={preset.suggestCoupon ? couponValidByCode[preset.suggestCoupon] : undefined}
                  mandatory={true}
                  onToggle={row ? (v) => void handleToggle(preset.key, row, v) : undefined}
                  onTestTeam={row ? () => void handleCampaignTestTeam(preset.key, row) : undefined}
                  onEdit={row ? () => setEditCampaign({ preset, campaign: row }) : undefined}
                />
              );
            })}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">{t("marketing.campaigns.optional_section")}</h3>
            {CAMPAIGN_PRESETS.filter((p) => !isMandatoryPreset(p.key)).map((preset) => {
              const row = campaignByPreset.get(preset.key);
              return (
                <CampaignPresetCard
                  key={preset.key}
                  preset={preset}
                  campaign={row}
                  lang={uiLang}
                  toggling={togglingId === row?.id}
                  testingTeam={campaignTestId === row?.id}
                  showWinbackHint={winbackHintKeys.has(preset.key)}
                  couponsHref={nav.admin("coupons")}
                  couponCode={preset.suggestCoupon}
                  couponReady={preset.suggestCoupon ? couponValidByCode[preset.suggestCoupon] : undefined}
                  mandatory={false}
                  onToggle={row ? (v) => void handleToggle(preset.key, row, v) : undefined}
                  onTestTeam={row ? () => void handleCampaignTestTeam(preset.key, row) : undefined}
                  onEdit={row ? () => setEditCampaign({ preset, campaign: row }) : undefined}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <Label>{t("marketing.broadcast.title_field")}</Label>
              <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} maxLength={60} />
              <Label>{t("marketing.broadcast.body_field")}</Label>
              <Textarea rows={3} value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} maxLength={180} />
              <Button
                type="button"
                className="w-full font-bold"
                style={{ backgroundColor: WINE }}
                disabled={broadcastSending || !marketingActive}
                onClick={() => void handleBroadcast()}
              >
                <Send className="mr-2 h-4 w-4" />
                {broadcastSending ? t("marketing.broadcast.sending") : t("marketing.broadcast.send")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                disabled={broadcastTestSending}
                onClick={() => void handleBroadcastTestTeam()}
              >
                {broadcastTestSending ? t("marketing.broadcast.test_team_sending") : t("marketing.broadcast.test_team")}
              </Button>
              <p className="text-[10px] text-muted-foreground">{t("marketing.broadcast.hint_audience")}</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border bg-muted/10 p-4">
              <p className="mb-3 text-xs font-semibold text-muted-foreground">{t("marketing.broadcast.preview")}</p>
              <PushPreviewMockup title={previewTitle} body={previewBody} storeName={storeName} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "sent", "failed", "skipped"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={historyFilter === f ? "default" : "outline"}
                className="h-8 text-xs"
                style={historyFilter === f ? { backgroundColor: WINE } : undefined}
                onClick={() => setHistoryFilter(f)}
              >
                {t(`marketing.history.filter.${f}`)}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredHistory.map((row) => {
              const camp = campaigns.find((c) => c.id === row.campaign_id);
              return (
                <div key={row.id} className="rounded-xl border bg-card p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{row.customer_phone}</span>
                    <Badge variant={row.status === "sent" ? "default" : "secondary"}>{row.status}</Badge>
                  </div>
                  {camp && <p className="text-muted-foreground">{camp.name}</p>}
                  {row.resolved_title && <p className="font-semibold">{row.resolved_title}</p>}
                  {row.resolved_body && <p className="text-muted-foreground line-clamp-2">{row.resolved_body}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(row.sent_at).toLocaleString()}
                    {row.message_locale ? ` · ${row.message_locale}` : ""}
                  </p>
                </div>
              );
            })}
            {filteredHistory.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-2xl">
                {t("marketing.history.empty")}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {editCampaign && (
        <CampaignMessageEditDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditCampaign(null);
          }}
          preset={editCampaign.preset}
          campaign={editCampaign.campaign}
          onSaved={() => void refreshQuiet()}
        />
      )}
    </div>
  );
};

export default MarketingPage;
