import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import { Gift, Megaphone, Plus, ChevronDown } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type LoyaltyRow = {
  id: string;
  phone: string;
  stamps: number;
  total_orders: number;
  rewards_redeemed: number;
};

type Campaign = {
  id: string;
  name: string;
  campaign_type: string;
  message_template: string;
  is_active: boolean;
  trigger_days: number | null;
};

const STAMPS_NEEDED = 10;

const LoyaltyPage = () => {
  const { t, lang } = useStaffT();
  const { storeId } = useAdminStoreId();
  const [accounts, setAccounts] = useState<LoyaltyRow[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campName, setCampName] = useState("");
  const [campMessage, setCampMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(true);

  useEffect(() => {
    setCampMessage(t("loyalty.campaign.default_message"));
  }, [t]);

  const load = async () => {
    if (!storeId) return;
    const [{ data: loyalty }, { data: camps }] = await Promise.all([
      supabase.from("loyalty_accounts").select("*").eq("store_id", storeId).order("stamps", { ascending: false }).limit(50),
      supabase.from("marketing_campaigns").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
    ]);
    setAccounts((loyalty as LoyaltyRow[]) || []);
    setCampaigns((camps as Campaign[]) || []);
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const resetStamps = async (id: string) => {
    const row = accounts.find((a) => a.id === id);
    if (!row) return;
    await supabase
      .from("loyalty_accounts")
      .update({ stamps: 0, rewards_redeemed: row.rewards_redeemed + 1 })
      .eq("id", id);
    toast.success(t("loyalty.toast.redeemed"));
    load();
  };

  const createCampaign = async () => {
    if (!storeId || !campName.trim()) return;
    const { error } = await supabase.from("marketing_campaigns").insert({
      store_id: storeId,
      name: campName.trim(),
      campaign_type: "winback",
      message_template: campMessage,
      trigger_days: 30,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("loyalty.toast.campaign_created"));
    setCampName("");
    setCreateOpen(false);
    load();
  };

  const toggleCampaign = async (c: Campaign) => {
    await supabase.from("marketing_campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    load();
  };

  if (!storeId) return <div className="p-6 text-sm text-muted-foreground">{t("common.no_store")}</div>;

  const readyCount = accounts.filter((a) => a.stamps >= STAMPS_NEEDED).length;
  const subtitle = panelT(lang, "loyalty.subtitle", { stamps: STAMPS_NEEDED, clients: accounts.length })
    + (readyCount > 0 ? panelT(lang, "loyalty.ready_count", { count: readyCount }) : "");

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <HowToUsePanel
        purpose={t("howto.loyalty.purpose")}
        whenToUse={t("howto.loyalty.when")}
        steps={[
          t("howto.loyalty.step1"),
          t("howto.loyalty.step2"),
          t("howto.loyalty.step3"),
          t("howto.loyalty.step4"),
        ]}
        howToConfirm={t("howto.loyalty.confirm")}
        assistantQuestion={t("howto.loyalty.assistant")}
      />
      <div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          {t("page.loyalty.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <Collapsible open={clientsOpen} onOpenChange={setClientsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-2xl border bg-card px-3.5 py-3 shadow-sm"
          >
            <span className="text-sm font-bold">{t("loyalty.clients.title")}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${clientsOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {accounts.map((a) => (
            <OpsCompactCard
              key={a.id}
              title={a.phone}
              summary={panelT(lang, "loyalty.stamps_summary", {
                stamps: a.stamps,
                total: STAMPS_NEEDED,
                orders: a.total_orders,
              })}
              meta={a.rewards_redeemed > 0 ? panelT(lang, "loyalty.redeemed", { n: a.rewards_redeemed }) : undefined}
              badges={a.stamps >= STAMPS_NEEDED ? [t("loyalty.badge.ready")] : []}
              editable={false}
              actions={
                a.stamps >= STAMPS_NEEDED ? (
                  <Button size="sm" className="h-9 font-bold text-xs" onClick={() => resetStamps(a.id)}>
                    {t("loyalty.redeem")}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    {panelT(lang, "loyalty.stamps_left", { n: STAMPS_NEEDED - a.stamps })}
                  </Badge>
                )
              }
            />
          ))}
          {accounts.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-2xl">
              {t("loyalty.clients.empty")}
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-primary" />
            {t("loyalty.campaigns")}
          </h3>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs" onClick={() => setCreateOpen((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            {createOpen ? t("common.close") : t("coupons.new")}
          </Button>
        </div>

        {createOpen && (
          <div className="rounded-2xl border bg-card p-3.5 space-y-2.5 mb-2 shadow-sm">
            <div>
              <Label className="text-xs">{t("loyalty.campaign.name")}</Label>
              <Input
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                placeholder={t("loyalty.campaign.name_ph")}
                className="h-10 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t("loyalty.campaign.message")}</Label>
              <Input value={campMessage} onChange={(e) => setCampMessage(e.target.value)} className="h-10 mt-1" />
            </div>
            <Button className="w-full h-11 font-bold" onClick={createCampaign}>
              {t("loyalty.campaign.create")}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {campaigns.map((c) => (
            <OpsCompactCard
              key={c.id}
              title={c.name}
              summary={panelT(lang, "loyalty.campaign.days", {
                type: c.campaign_type,
                days: c.trigger_days ?? "—",
              })}
              meta={c.message_template.length > 48 ? `${c.message_template.slice(0, 48)}…` : c.message_template}
              inactive={!c.is_active}
              badges={c.is_active ? [t("loyalty.badge.active")] : [t("coupons.badge.paused")]}
              editable={false}
              actions={<Switch checked={c.is_active} onCheckedChange={() => toggleCampaign(c)} />}
            />
          ))}
          {campaigns.length === 0 && !createOpen && (
            <p className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-2xl">
              {t("loyalty.campaigns.empty")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPage;
