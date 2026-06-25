import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import { nav } from "@/lib/navPaths";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OpsCompactCard from "@/components/panel/OpsCompactCard";
import { toast } from "sonner";
import { Gift, ChevronDown, Megaphone } from "lucide-react";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type LoyaltyRow = {
  id: string;
  phone: string;
  stamps: number;
  total_orders: number;
  rewards_redeemed: number;
};

const STAMPS_NEEDED = 10;
const WINE = "#3a0205";

const LoyaltyPage = () => {
  const { t, lang } = useStaffT();
  const { storeId } = useAdminStoreId();
  const [accounts, setAccounts] = useState<LoyaltyRow[]>([]);
  const [clientsOpen, setClientsOpen] = useState(true);

  const load = async () => {
    if (!storeId) return;
    const { data: loyalty } = await supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("store_id", storeId)
      .order("stamps", { ascending: false })
      .limit(50);
    setAccounts((loyalty as LoyaltyRow[]) || []);
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

  if (!storeId) return <div className="p-6 text-sm text-muted-foreground">{t("common.no_store")}</div>;

  const readyCount = accounts.filter((a) => a.stamps >= STAMPS_NEEDED).length;
  const subtitle =
    panelT(lang, "loyalty.subtitle", { stamps: STAMPS_NEEDED, clients: accounts.length }) +
    (readyCount > 0 ? panelT(lang, "loyalty.ready_count", { count: readyCount }) : "");

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

      <div className="rounded-2xl border bg-gradient-to-br from-[#3a0205]/10 to-transparent p-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Megaphone className="h-5 w-5 shrink-0 mt-0.5" style={{ color: WINE }} />
          <div>
            <p className="text-sm font-bold">{t("loyalty.marketing_link.title")}</p>
            <p className="text-xs text-muted-foreground">{t("loyalty.marketing_link.hint")}</p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0 font-bold" style={{ backgroundColor: WINE }}>
          <Link to={nav.admin("marketing")}>{t("loyalty.marketing_link.cta")}</Link>
        </Button>
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
    </div>
  );
};

export default LoyaltyPage;
