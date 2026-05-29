import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, XCircle, ChevronRight, Loader2 } from "lucide-react";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import { nav } from "@/lib/navPaths";
import { Button } from "@/components/ui/button";
import { useAdminStoreId } from "@/hooks/useAdminStoreId";
import { loadStoredFullAuditReport } from "@/services/fullAppAuditService";
import { probeStaffAuthAudit } from "@/lib/diagnostics/staffAuthAuditProbe";
import type { AuditFinding } from "@/services/adminSystemAudit";

type Props = {
  /** painel operacional vs administração */
  area?: "panel" | "admin";
};

const OperationalDiagnosticsBanner = ({ area = "panel" }: Props) => {
  const { criticalIssues, failCount, warnCount, running, run, lastRun } = useOperationalDiagnostics();
  const { storeId } = useAdminStoreId();
  const diagnosticsPath = nav.admin("diagnostics");
  const [staffFindings, setStaffFindings] = useState<AuditFinding[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (!lastRun) void run();
  }, [lastRun, run]);

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
  }, [storeId, lastRun]);

  const staffCriticalCount = staffFindings.length;
  const totalFail = failCount + staffCriticalCount;
  const totalWarn = warnCount + (staffFindings.some((f) => f.severity === "warning") ? 1 : 0);

  const topStaff = staffFindings[0];
  const topOps = criticalIssues.find((i) => i.status === "fail") ?? criticalIssues[0];

  const bannerMessage = useMemo(() => {
    if (totalFail > 0) {
      const parts: string[] = [];
      if (failCount > 0) parts.push(`${failCount} pagamento(s)/sistema`);
      if (staffCriticalCount > 0) parts.push(`${staffCriticalCount} equipa/servidor`);
      return `${totalFail} problema(s) crítico(s) — ${parts.join(" · ")}`;
    }
    if (totalWarn > 0) return `${warnCount + (totalWarn - warnCount)} aviso(s) — convém rever antes de abrir`;
    return null;
  }, [totalFail, failCount, staffCriticalCount, totalWarn, warnCount]);

  if ((running || staffLoading) && !lastRun && staffFindings.length === 0) {
    return (
      <div className="mb-4 rounded-xl border bg-muted/40 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        A verificar estado do sistema…
      </div>
    );
  }

  if (!bannerMessage) return null;

  const Icon = totalFail > 0 ? XCircle : AlertTriangle;
  const tone =
    totalFail > 0
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200";

  const topLabel = topStaff?.label ?? topOps?.label;
  const topDetail = topStaff?.action ?? topStaff?.detail ?? topOps?.detail;
  const topAction = topStaff ? topStaff.action : topOps?.action;

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
          {area === "admin" && staffCriticalCount > 0 && (
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
      </div>
    </div>
  );
};

export default OperationalDiagnosticsBanner;
