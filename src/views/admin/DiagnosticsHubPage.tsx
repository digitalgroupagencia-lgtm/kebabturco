import { useSearchParams } from "react-router-dom";
import { Activity, Bell, CreditCard, Gift, Megaphone, Printer, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { nav } from "@/lib/navPaths.ts";
import PushDiagnosticPanel from "@/components/admin/diagnostics/PushDiagnosticPanel";
import PrinterDiagnosticPanel from "@/components/admin/diagnostics/PrinterDiagnosticPanel";
import CouponDiagnosticPanel from "@/components/admin/diagnostics/CouponDiagnosticPanel";
import LoyaltyDiagnosticPanel from "@/components/admin/diagnostics/LoyaltyDiagnosticPanel";
import CampaignDiagnosticPanel from "@/components/admin/diagnostics/CampaignDiagnosticPanel";
import PlanDiagnosticPanel from "@/components/admin/diagnostics/PlanDiagnosticPanel";

const TABS = [
  { id: "push", label: "Push", icon: Bell },
  { id: "printer", label: "Impressora", icon: Printer },
  { id: "coupons", label: "Cupões", icon: Tag },
  { id: "loyalty", label: "Fidelidade", icon: Gift },
  { id: "campaigns", label: "Campanhas", icon: Megaphone },
  { id: "plans", label: "Planos", icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FULL_PAGE_LINKS: Partial<Record<TabId, string>> = {
  push: nav.admin("push-test"),
  printer: nav.admin("printer"),
  coupons: nav.admin("coupons"),
  loyalty: nav.admin("loyalty"),
  plans: nav.admin("plans"),
};

export default function DiagnosticsHubPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabId) || "push";
  const validTab = TABS.some((t) => t.id === tab) ? tab : "push";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Centro de testes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Diagnósticos, testes e logs por módulo — push, impressora, cupões, fidelidade, campanhas e planos.
        </p>
      </div>

      <Tabs
        value={validTab}
        onValueChange={(v) => setParams({ tab: v })}
        className="w-full"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4 space-y-4">
            {FULL_PAGE_LINKS[t.id] ? (
              <p className="text-xs text-muted-foreground">
                <Link to={FULL_PAGE_LINKS[t.id]!} className="text-primary underline">
                  Abrir página operacional completa
                </Link>
              </p>
            ) : null}
            {t.id === "push" && <PushDiagnosticPanel embedded showStoreSwitcher />}
            {t.id === "printer" && <PrinterDiagnosticPanel />}
            {t.id === "coupons" && <CouponDiagnosticPanel />}
            {t.id === "loyalty" && <LoyaltyDiagnosticPanel />}
            {t.id === "campaigns" && <CampaignDiagnosticPanel />}
            {t.id === "plans" && <PlanDiagnosticPanel />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
