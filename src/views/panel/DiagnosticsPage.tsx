import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { nav } from "@/lib/navPaths.ts";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronRight,
  Filter,
  Server,
  ShoppingBag,
  ChefHat,
  Truck,
  Store,
  Shield,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_BUILD_ID } from "@/lib/appCacheBust";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import { useFullAppAudit } from "@/hooks/useFullAppAudit";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";
import type { StaffI18nKey } from "@/lib/staffI18n";
import type { AuditFinding, AuditPanel, AuditSeverity } from "@/services/adminSystemAudit";

function formatBuildStamp(id: string) {
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1e12) return id;
  return new Date(n).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PANEL_ICONS: Record<AuditPanel, ElementType> = {
  backend: Server,
  customer: ShoppingBag,
  restaurant: ChefHat,
  delivery: Truck,
  seller: Store,
  admin: Shield,
};

const SEVERITY_META: Record<
  AuditSeverity,
  { labelKey: StaffI18nKey; ring: string; badge: string; icon: ElementType; order: number }
> = {
  critical: {
    labelKey: "diagnostics.severity.critical",
    ring: "border-destructive/50 bg-destructive/5",
    badge: "bg-destructive text-destructive-foreground",
    icon: XCircle,
    order: 0,
  },
  warning: {
    labelKey: "diagnostics.severity.warning",
    ring: "border-amber-500/50 bg-amber-500/5",
    badge: "bg-amber-500 text-white",
    icon: AlertTriangle,
    order: 1,
  },
  suggestion: {
    labelKey: "diagnostics.severity.suggestion",
    ring: "border-sky-500/40 bg-sky-500/5",
    badge: "bg-sky-500 text-white",
    icon: Activity,
    order: 2,
  },
  ok: {
    labelKey: "diagnostics.severity.ok",
    ring: "border-success/40 bg-success/5",
    badge: "bg-success text-success-foreground",
    icon: CheckCircle2,
    order: 3,
  },
};

type FilterMode = "all" | "issues" | "critical";

const DiagnosticsPage = () => {
  const { t, lang } = useStaffT();
  const { storeId } = useAdminStoreId();
  const { tenant } = useSelectedTenant();
  const { report, running, run } = useFullAppAudit(storeId, tenant?.id ?? null);
  const [filter, setFilter] = useState<FilterMode>("issues");
  const [showOk, setShowOk] = useState(false);

  const filteredSections = useMemo(() => {
    if (!report) return [];
    return report.sections
      .map((section) => ({
        ...section,
        findings: section.findings.filter((f) => {
          if (filter === "critical") return f.severity === "critical";
          if (filter === "issues") return f.severity !== "ok";
          if (!showOk && f.severity === "ok") return false;
          return true;
        }),
      }))
      .filter((s) => s.findings.length > 0);
  }, [report, filter, showOk]);

  const summary = report?.summary;
  const everythingOk =
    report && summary && summary.totalIssues === 0 && summary.ok > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            {t("diagnostics.heading")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("diagnostics.subtitle")}</p>
          <p className="text-sm mt-2">
            <Link to={nav.admin("diagnostics-hub")} className="text-primary font-semibold underline">
              {t("diagnostics.test_center")}
            </Link>
            <span className="text-muted-foreground"> {t("diagnostics.test_center_hint")}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {report
              ? panelT(lang, "diagnostics.last_audit", {
                  date: new Date(report.ranAt).toLocaleString(),
                  duration: (report.durationMs / 1000).toFixed(1),
                  version: formatBuildStamp(APP_BUILD_ID),
                })
              : panelT(lang, "diagnostics.never", { version: formatBuildStamp(APP_BUILD_ID) })}
          </p>
        </div>
        <Button type="button" onClick={() => void run()} disabled={running} className="shrink-0">
          {running ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          {running ? t("diagnostics.auditing") : t("diagnostics.audit_all")}
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile sev="ok" count={summary.ok} label={t("diagnostics.severity.ok")} sub={t("diagnostics.summary.ok")} />
          <SummaryTile sev="critical" count={summary.critical} label={t("diagnostics.severity.critical")} sub={t("diagnostics.summary.critical")} />
          <SummaryTile sev="warning" count={summary.warning} label={t("diagnostics.severity.warning")} sub={t("diagnostics.summary.warning")} />
          <SummaryTile sev="suggestion" count={summary.suggestion} label={t("diagnostics.severity.suggestion")} sub={t("diagnostics.summary.suggestion")} />
        </div>
      )}

      {report && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <FilterButton active={filter === "issues"} onClick={() => setFilter("issues")}>
            {t("diagnostics.filter.issues")}
          </FilterButton>
          <FilterButton active={filter === "critical"} onClick={() => setFilter("critical")}>
            {t("diagnostics.filter.critical")}
          </FilterButton>
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            {t("diagnostics.filter.all")}
          </FilterButton>
          {filter === "all" && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOk}
                onChange={(e) => setShowOk(e.target.checked)}
                className="rounded"
              />
              {t("diagnostics.show_ok")}
            </label>
          )}
        </div>
      )}

      {!report && !running && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("diagnostics.empty_prompt")}
          </CardContent>
        </Card>
      )}

      {everythingOk && (
        <Card className="border-2 border-success/40 bg-success/5">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="font-black text-lg">{t("diagnostics.all_ok.title")}</p>
              <p className="text-sm text-muted-foreground">
                {panelT(lang, "diagnostics.all_ok.body", { count: summary!.ok })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredSections.map((section) => {
        const Icon = PANEL_ICONS[section.id];
        const issueCount = section.findings.filter((f) => f.severity !== "ok").length;
        return (
          <section key={section.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{section.label}</h3>
              <span className="text-xs text-muted-foreground">
                ({issueCount > 0
                  ? panelT(lang, "diagnostics.alerts", { count: issueCount })
                  : t("diagnostics.no_alerts")})
              </span>
            </div>
            <div className="space-y-2">
              {section.findings.map((f) => (
                <FindingCard key={f.id} f={f} />
              ))}
            </div>
          </section>
        );
      })}

      {report && filteredSections.length === 0 && filter !== "all" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("diagnostics.no_issues_filter")}{" "}
            <button type="button" className="text-primary underline" onClick={() => setFilter("all")}>
              {t("diagnostics.view_all")}
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryTile({
  sev,
  count,
  label,
  sub,
}: {
  sev: AuditSeverity;
  count: number;
  label: string;
  sub: string;
}) {
  const meta = SEVERITY_META[sev];
  return (
    <Card className={`border-2 ${meta.ring}`}>
      <CardContent className="p-4">
        <p className="text-3xl font-black">{count}</p>
        <p className="text-sm font-bold mt-1">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function buildFindingClipboard(f: AuditFinding): string {
  const lines = [
    `[Auditoria — ${f.severity.toUpperCase()}] ${f.label}`,
    f.detail ? `Detalhe: ${f.detail}` : null,
    f.action ? `Acção sugerida: ${f.action}` : null,
    f.link ? `Tela: ${f.link}` : null,
    f.category ? `Categoria: ${f.category}` : null,
    f.panel ? `Painel: ${f.panel}` : null,
    `ID interno: ${f.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function FindingCard({ f }: { f: AuditFinding }) {
  const { t, lang } = useStaffT();
  const meta = SEVERITY_META[f.severity];
  const Icon = meta.icon;
  const location = useLocation();
  const currentPath = location.pathname;
  const linkPath = f.link?.split("?")[0];
  const isSelfLink = linkPath === currentPath;
  const showLink = f.link && !isSelfLink;
  const isIssue = f.severity !== "ok";
  const findingText = buildFindingClipboard(f);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(findingText);
      toast.success(t("diagnostics.toast.copied"));
    } catch {
      toast.error(t("diagnostics.toast.copy_error"));
    }
  };

  const handleAskAssistant = () => {
    const text = panelT(lang, "diagnostics.assistant.prompt", { text: findingText });
    window.dispatchEvent(new CustomEvent("assistant:ask", { detail: { text } }));
  };

  return (
    <Card className={`border-2 ${meta.ring}`}>
      <CardContent className="p-4 flex gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm">{f.label}</p>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.badge}`}>
              {t(meta.labelKey)}
            </span>
          </div>
          {f.detail && (
            <p className="text-xs text-muted-foreground mt-1 break-words">{f.detail}</p>
          )}
          {f.action && <p className="text-xs font-medium mt-1.5">{f.action}</p>}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {showLink && (
              <Link
                to={f.link!}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                {f.linkLabel ?? t("diagnostics.resolve")}
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
            {isIssue && (
              <>
                <button
                  type="button"
                  onClick={handleAskAssistant}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary px-2 py-1 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  {t("diagnostics.ask_ai")}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border hover:border-foreground/30 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {t("diagnostics.copy")}
                </button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export default DiagnosticsPage;
