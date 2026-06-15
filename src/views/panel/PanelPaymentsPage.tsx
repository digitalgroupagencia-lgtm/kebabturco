import { useEffect, useState } from "react";
import PremiumPageHeader from "@/components/admin/premium/PremiumPageHeader";
import { Loader2, CreditCard, Smartphone, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePanelStore } from "@/contexts/PanelStoreContext";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HowToUsePanel from "@/components/admin/HowToUsePanel";
import AskAssistantButton from "@/components/admin/AskAssistantButton";

type Row = {
  id: string;
  gateway_code: string;
  status: "disabled" | "sandbox" | "production";
  last_test_at: string | null;
  last_test_success: boolean | null;
  last_test_message: string | null;
};

type LogRow = {
  id: string; created_at: string; gateway_code: string;
  direction: string; http_status: number | null; error_message: string | null;
};

const META: Record<string, { label: string; icon: typeof CreditCard }> = {
  stripe: { label: "Stripe", icon: CreditCard },
  redsys: { label: "Redsys", icon: ShieldCheck },
  bizum: { label: "Bizum", icon: Smartphone },
};

export default function PanelPaymentsPage() {
  const { t, lang } = useStaffT();
  const { storeId } = usePanelStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const reload = async () => {
    if (!storeId) return;
    setLoading(true);
    const [{ data: cfgs }, { data: lg }] = await Promise.all([
      supabase.from("store_payment_gateways").select("id, gateway_code, status, last_test_at, last_test_success, last_test_message").eq("store_id", storeId),
      supabase.from("payment_gateway_logs").select("id, created_at, gateway_code, direction, http_status, error_message").eq("store_id", storeId).order("created_at", { ascending: false }).limit(50),
    ]);
    setRows((cfgs as Row[]) ?? []);
    setLogs((lg as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [storeId]);

  const toggle = async (row: Row, enabled: boolean) => {
    const status = enabled ? "sandbox" : "disabled";
    const { error } = await supabase.from("store_payment_gateways").update({ status }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success(t("payments.toast.updated")); reload(); }
  };

  const test = async (gateway: string) => {
    if (!storeId) return;
    setTesting(gateway);
    const { data } = await supabase.functions.invoke("payment-gateway-test", { body: { storeId, gateway } });
    setTesting(null);
    const ok = (data as { success?: boolean })?.success;
    const msg = (data as { message?: string })?.message ?? "";
    if (ok) toast.success(msg); else toast.warning(msg || t("payments.toast.test_fail"));
    reload();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={CreditCard}
        title={t("page.payments.title")}
        subtitle={t("payments.subtitle")}
        actions={
          <AskAssistantButton
            question={t("payments.explain_question")}
            label={t("payments.explain_btn")}
          />
        }
      />

      <HowToUsePanel
        purpose={t("howto.payments.purpose")}
        whenToUse={t("howto.payments.when")}
        steps={[
          { title: t("howto.payments.step1.title"), detail: t("howto.payments.step1.detail") },
          { title: t("howto.payments.step2.title"), detail: t("howto.payments.step2.detail") },
          { title: t("howto.payments.step3.title"), detail: t("howto.payments.step3.detail") },
          { title: t("howto.payments.step4.title"), detail: t("howto.payments.step4.detail") },
        ]}
        howToConfirm={t("howto.payments.confirm")}
        assistantQuestion={t("howto.payments.assistant")}
      />

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">{t("payments.tab.status")}</TabsTrigger>
          <TabsTrigger value="logs">{panelT(lang, "payments.tab.logs", { count: logs.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-3">
          {["stripe", "redsys", "bizum"].map((code) => {
            const r = rows.find((x) => x.gateway_code === code);
            const m = META[code];
            const enabled = r && r.status !== "disabled";
            return (
              <Card key={code}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <m.icon className="h-4 w-4" /> {m.label}
                    <Badge variant={enabled ? "default" : "outline"} className="ml-2">
                      {r?.status ?? t("payments.status.not_configured")}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Switch checked={!!enabled} onCheckedChange={(v) => r && toggle(r, v)} disabled={!r} />
                    <Button size="sm" variant="outline" onClick={() => test(code)} disabled={testing === code}>
                      <RefreshCw className={`h-3 w-3 mr-1 ${testing === code ? "animate-spin" : ""}`} /> {t("payments.test")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {r?.last_test_at ? (
                    <>
                      {panelT(lang, "payments.last_test", {
                        date: new Date(r.last_test_at).toLocaleString(),
                        msg: r.last_test_message ?? "",
                      })}
                    </>
                  ) : (
                    <>{t("payments.creds_hint")}</>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("payments.logs.title")}</CardTitle></CardHeader>
            <CardContent>
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">{t("payments.logs.empty")}</p> : (
                <div className="space-y-1 text-xs font-mono max-h-[480px] overflow-auto">
                  {logs.map((l) => (
                    <div key={l.id} className={`p-2 rounded ${l.error_message ? "bg-destructive/5" : "bg-muted/30"}`}>
                      <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>{" "}
                      <Badge variant="outline" className="text-[10px]">{l.gateway_code}</Badge>{" "}
                      <Badge variant="outline" className="text-[10px]">{l.direction}</Badge>{" "}
                      {l.http_status && <Badge variant="outline" className="text-[10px]">{l.http_status}</Badge>}
                      {l.error_message && <div className="text-destructive mt-1">{l.error_message}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
