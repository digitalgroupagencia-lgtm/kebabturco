import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, XCircle, ChevronRight, Loader2 } from "lucide-react";
import { useOperationalDiagnostics } from "@/features/ops/useOperationalDiagnostics";
import { nav } from "@/lib/navPaths";
import { Button } from "@/components/ui/button";

type Props = {
  /** painel operacional vs administração */
  area?: "panel" | "admin";
};

const OperationalDiagnosticsBanner = ({ area = "panel" }: Props) => {
  const { criticalIssues, failCount, warnCount, running, run, lastRun } = useOperationalDiagnostics();
  const diagnosticsPath = area === "admin" ? nav.admin("diagnostics") : nav.panel("diagnostics");

  useEffect(() => {
    if (!lastRun) void run();
  }, [lastRun, run]);

  if (running && !lastRun) {
    return (
      <div className="mb-4 rounded-xl border bg-muted/40 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        A verificar estado do sistema…
      </div>
    );
  }

  if (failCount === 0 && warnCount === 0) return null;

  const top = criticalIssues.find((i) => i.status === "fail") ?? criticalIssues[0];
  const Icon = failCount > 0 ? XCircle : AlertTriangle;
  const tone =
    failCount > 0
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200";

  return (
    <div className={`mb-4 rounded-xl border-2 px-4 py-3 space-y-2 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">
            {failCount > 0
              ? `${failCount} problema(s) que podem afectar pedidos ou pagamentos`
              : `${warnCount} aviso(s) — convém rever antes de abrir`}
          </p>
          {top && (
            <>
              <p className="text-sm mt-1 opacity-90">{top.label}: {top.detail}</p>
              {top.action && (
                <p className="text-xs mt-1.5 font-semibold opacity-95">→ {top.action}</p>
              )}
            </>
          )}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 h-9 gap-1 bg-background/80">
          <Link to={diagnosticsPath}>
            Ver tudo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default OperationalDiagnosticsBanner;
