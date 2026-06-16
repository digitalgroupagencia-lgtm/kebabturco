import { useEffect, useMemo, useState } from "react";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import {
  issuesOnly,
  loadStoredFullAuditReport,
  type FullAuditReport,
} from "@/services/fullAppAuditService";
import { probeStaffAuthAudit } from "@/lib/diagnostics/staffAuthAuditProbe";
import type { AuditFinding } from "@/services/adminSystemAudit";

type Area = "panel" | "admin";

function severityRank(s: AuditFinding["severity"]): number {
  return { critical: 0, warning: 1, suggestion: 2, ok: 3 }[s];
}

export function useStaffDiagnosticsAlert(area: Area = "panel") {
  const { failCount, warnCount, running, run, lastRun } = useOperationalDiagnostics();
  const { storeId } = useAdminStoreId();
  const [storedReport, setStoredReport] = useState<FullAuditReport | null>(() =>
    loadStoredFullAuditReport(),
  );
  const [staffFindings, setStaffFindings] = useState<AuditFinding[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

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

  const message = useMemo(() => {
    if (totalFail > 0) {
      return `${totalFail} problema(s) crítico(s) — convém resolver antes de abrir`;
    }
    if (totalWarn > 0) return `${totalWarn} aviso(s) — convém rever antes de abrir`;
    return null;
  }, [totalFail, totalWarn]);

  const loading =
    (running || staffLoading) && !lastRun && !storedReport && staffFindings.length === 0;

  return {
    area,
    loading,
    visible: Boolean(message) || loading,
    isCritical: totalFail > 0,
    badgeCount: totalFail > 0 ? totalFail : totalWarn,
    message,
    topIssue,
    staffCriticalCount,
    useAuditReport,
  };
}
