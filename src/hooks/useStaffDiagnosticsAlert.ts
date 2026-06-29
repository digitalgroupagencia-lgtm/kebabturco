import { useEffect, useMemo, useState } from "react";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { probeStaffAuthAudit } from "@/lib/diagnostics/staffAuthAuditProbe";
import type { AuditFinding } from "@/services/adminSystemAudit";

type Area = "panel" | "admin";

type TopIssue = Pick<AuditFinding, "label" | "detail" | "action">;

export function useStaffDiagnosticsAlert(area: Area = "panel") {
  const { warnCount, running, run, lastRun, criticalIssues } = useOperationalDiagnostics();
  const { storeId } = useAdminStoreId();
  const [staffFindings, setStaffFindings] = useState<AuditFinding[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    void run();
  }, [run, storeId]);

  useEffect(() => {
    if (!storeId) {
      setStaffFindings([]);
      return;
    }
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
  }, [storeId, lastRun]);

  const staffCriticalCount = staffFindings.length;
  const opsCriticalCount = criticalIssues.length;
  const totalFail = opsCriticalCount + staffCriticalCount;
  const totalWarn = warnCount;

  const topIssue = useMemo((): TopIssue | null => {
    const topOps = criticalIssues[0];
    if (topOps) {
      return { label: topOps.label, detail: topOps.detail, action: topOps.action };
    }
    const topStaff = staffFindings[0];
    if (topStaff) {
      return { label: topStaff.label, detail: topStaff.detail, action: topStaff.action };
    }
    return null;
  }, [criticalIssues, staffFindings]);

  const message = useMemo(() => {
    if (totalFail > 0) {
      return `${totalFail} problema(s) crítico(s), convém resolver antes de abrir`;
    }
    if (totalWarn > 0) return `${totalWarn} aviso(s), convém rever antes de abrir`;
    return null;
  }, [totalFail, totalWarn]);

  const loading = (running || staffLoading) && !lastRun;

  return {
    area,
    loading,
    visible: Boolean(message) || loading,
    isCritical: totalFail > 0,
    badgeCount: totalFail > 0 ? totalFail : totalWarn,
    message,
    topIssue,
    staffCriticalCount,
  };
}
