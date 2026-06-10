import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, XCircle, ChevronRight, Loader2, X } from "lucide-react";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import { nav } from "@/lib/navPaths";
import { Button } from "@/components/ui/button";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import {
  issuesOnly,
  loadStoredFullAuditReport,
  type FullAuditReport,
} from "@/services/fullAppAuditService";
import { probeStaffAuthAudit } from "@/lib/diagnostics/staffAuthAuditProbe";
import type { AuditFinding } from "@/services/adminSystemAudit";

type Props = {
  /** painel operacional vs administração */
  area?: "panel" | "admin";
};

function severityRank(s: AuditFinding["severity"]): number {
  return { critical: 0, warning: 1, suggestion: 2, ok: 3 }[s];
}

const OperationalDiagnosticsBanner = ({ area = "panel" }: Props) => {
  const { failCount, warnCount, running, run, lastRun } = useOperationalDiagnostics();
  const { storeId } = useAdminStoreId();
  const diagnosticsPath = nav.admin("diagnostics");
  const [storedReport, setStoredReport] = useState<FullAuditReport | null>(() =>
    loadStoredFullAuditReport(),
  );
  const [staffFindings, setStaffFindings] = useState<AuditFinding[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const location = useLocation();

  const path = location.pathname;
  const showOnRoute =
    path === nav.admin() ||
    path.startsWith(nav.admin("diagnostics")) ||
    path.startsWith(nav.admin("system")) ||
    path === nav.panel() ||
    path.startsWith(nav.panel("live"));

  const dismissKey = "ops-diagnostics-banner-dismissed";
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(dismissKey) === "1");
    } catch {
      // ignore
    }
  }, []);
  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  useEffect(() => {
    const refresh = () => setStoredReport(loadStoredFullAuditReport());
    refresh();
    window.addEventListener("kebabturco:full-audit-updated", refresh);
    return () => window.removeEventListener("kebabturco:full-audit-updated", refresh);
  }, [lastRun]);

  useEffect(() => {
    if (!lastRun && !storedReport) void run();
  }, [lastRun, run, storedReport]);

  useEffect(() => {
    const stored = loadStoredFullAuditReport();
    const storedCritical =
      stored?.allFindings.filter(
        (f) =>
          f.severity === "critical" &&
          (f.panel === "backend" || f.category === "team" || f.id.startsWith("rpc-missing-manager_")),
      ) ?? [];

    if (storedCritical.length > 0) {
      setStaffFindings(storedCritical);
      return;
    }

    if (!storeId) return;
    let active = true;
    setStaffLoading(true);
    void probeStaffAuthAudit(storeId)
      .then((findings) => {
        if (active) setStaffFindings(findings.filter((f) => f.severity === "critical"));
      })
      .finally(() => {
        if (active) setStaffLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storeId, lastRun, storedReport?.ranAt]);

  const useAuditReport = Boolean(storedReport);
  const auditIssues = useAuditReport ? issuesOnly(storedReport!) : [];
  const auditCritical = storedReport?.summary.critical ?? 0;
  const auditWarn = storedReport?.summary.warning ?? 0;

  const staffCriticalCount = staffFindings.length;
  const totalFail = useAuditReport ? auditCritical : failCount + staffCriticalCount;
  const totalWarn = useAuditReport ? auditWarn : warnCount;

  const topIssue = useMemo(() => {
    if (useAuditReport && auditIssues.length > 0) {
      return [...auditIssues].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))[0];
    }
    const topStaff = staffFindings[0];
    if (topStaff) return topStaff;
    return null;
  }, [useAuditReport, auditIssues, staffFindings]);

  const bannerMessage = useMemo(() => {
    if (totalFail > 0) {
      return `${totalFail} problema(s) crítico(s) — convém resolver antes de abrir`;
    }
    if (totalWarn > 0) return `${totalWarn} aviso(s) — convém rever antes de abrir`;
    return null;
  }, [totalFail, totalWarn]);

  if ((running || staffLoading) && !lastRun && !storedReport && staffFindings.length === 0) {
    return (
      <div className="mb-4 rounded-xl border bg-muted/40 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        A verificar estado do sistema…
      </div>
    );
  }

  if (!showOnRoute) return null;
  if (dismissed) return null;
  if (!bannerMessage) return null;

  const Icon = totalFail > 0 ? XCircle : AlertTriangle;
  const tone =
    totalFail > 0
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200";

  const topLabel = topIssue?.label;
  const topDetail = topIssue?.detail;
  const topAction = topIssue?.action;

  return (
    <div className={`mb-4 rounded-xl border-2 px-4 py-3 space-y-2 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{bannerMessage}</p>
          {topLabel && (
            <>
              <p className="text-sm mt-1 opacity-90">
                {topLabel}
                {topDetail && !topAction ? `: ${topDetail}` : ""}
              </p>
              {topAction && (
                <p className="text-xs mt-1.5 font-semibold opacity-95">→ {topAction}</p>
              )}
            </>
          )}
          {area === "admin" && staffCriticalCount > 0 && !useAuditReport && (
            <p className="text-xs mt-1 opacity-80">
              Inclui verificação de login da equipa e servidores críticos.
            </p>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 h-9 gap-1 bg-background/80">
          <Link to={diagnosticsPath}>
            Auditar tudo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso"
          className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-foreground/10 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default OperationalDiagnosticsBanner;
