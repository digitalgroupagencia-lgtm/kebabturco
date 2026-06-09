import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, XCircle, ChevronRight, X } from "lucide-react";
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
  const { criticalIssues, failCount, warnCount, run, lastRun } = useOperationalDiagnostics();
  const { storeId } = useAdminStoreId();
  const diagnosticsPath = nav.admin("diagnostics");
  const [staffFindings, setStaffFindings] = useState<AuditFinding[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const location = useLocation();

  // Só mostra o banner global no Command Center / Estado do sistema / Diagnóstico.
  // Restante das telas internas: silêncio (evita topo pesado em todas).
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
  const topLabel = topStaff?.label ?? topOps?.label;

  const bannerMessage = useMemo(() => {
    if (totalFail > 0) {
      const parts: string[] = [];
      if (failCount > 0) parts.push(`${failCount} pagamento(s)/sistema`);
      if (staffCriticalCount > 0) parts.push(`${staffCriticalCount} equipa/servidor`);
      return `${totalFail} problema(s) crítico(s) · ${parts.join(" · ")}`;
    }
    if (totalWarn > 0) return `${totalWarn} aviso(s) — rever antes de abrir`;
    return null;
  }, [totalFail, failCount, staffCriticalCount, totalWarn]);

  if (!showOnRoute) return null;
  if (dismissed) return null;
  if (!bannerMessage) return null;

  const Icon = totalFail > 0 ? XCircle : AlertTriangle;
  const tone =
    totalFail > 0
      ? "border-destructive/30 bg-destructive/10"
      : "border-amber-500/30 bg-amber-500/10";
  const iconTone = totalFail > 0 ? "text-destructive" : "text-amber-500";

  // Suprime aviso “area não usada”
  void area;
  void topLabel;
  void staffLoading;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm text-foreground ${tone}`}>
      <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} />
      <p className="flex-1 min-w-0 truncate">{bannerMessage}</p>
      <Button asChild variant="outline" size="sm" className="shrink-0 h-8 gap-1">
        <Link to={diagnosticsPath}>
          Auditar tudo
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-foreground/10 text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default OperationalDiagnosticsBanner;
