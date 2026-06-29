import type { AuditFinding } from "@/services/adminSystemAudit";
import { probeCouponDiagnostics } from "@/lib/diagnostics/couponTestService";
import { probeLoyaltyDiagnostics } from "@/lib/diagnostics/loyaltyTestService";
import { probePrinterDiagnostics } from "@/lib/diagnostics/printerDiagnostics";
import { runPlanFeatureProbe } from "@/lib/diagnostics/planFeatureProbe";

export async function probeHubModules(storeId: string | null): Promise<AuditFinding[]> {
  if (!storeId) return [];
  const findings: AuditFinding[] = [];

  try {
    const printer = await probePrinterDiagnostics(storeId);
    if (printer) {
      if (!printer.configEnabled) {
        findings.push({
          id: "hub-printer-disabled",
          category: "printing",
          severity: "warning",
          label: "Impressora — desactivada nas configurações",
          panel: "admin",
          link: "/admin/printer",
        });
      } else if (printer.bridgeStatus !== "active") {
        findings.push({
          id: "hub-printer-bridge",
          category: "printing",
          severity: "warning",
          label: "Impressora — bridge inactivo ou offline",
          panel: "admin",
          link: "/admin/printer",
        });
      } else {
        findings.push({
          id: "hub-printer-ok",
          category: "printing",
          severity: "ok",
          label: "Impressora — configurada e bridge activo",
          panel: "admin",
        });
      }
      if ((printer.jobCounts.failed ?? 0) > 0) {
        findings.push({
          id: "hub-print-failed-jobs",
          category: "printing",
          severity: "warning",
          label: `${printer.jobCounts.failed} trabalho(s) de impressão falhados`,
          panel: "admin",
          link: "/admin/printer",
        });
      }
    }
  } catch {
    findings.push({
      id: "hub-printer-error",
      category: "printing",
      severity: "warning",
      label: "Não foi possível verificar impressora",
      panel: "admin",
    });
  }

  try {
    const coupons = await probeCouponDiagnostics(storeId);
    findings.push({
      id: "hub-coupons",
      category: "menu",
      severity: coupons.activeCoupons > 0 ? "ok" : "suggestion",
      label:
        coupons.activeCoupons > 0
          ? `${coupons.activeCoupons} cupão(ões) activo(s)`
          : "Nenhum cupão activo",
      panel: "admin",
      link: "/admin/coupons",
    });
  } catch {
    /* ignore */
  }

  try {
    const loyalty = await probeLoyaltyDiagnostics(storeId);
    findings.push({
      id: "hub-loyalty",
      category: "menu",
      severity: "ok",
      label: `Fidelidade — ${loyalty.accountCount} conta(s), ${loyalty.readyRewards} prémio(s) prontos`,
      panel: "admin",
      link: "/admin/loyalty",
    });
  } catch {
    /* ignore */
  }

  try {
    const plan = await runPlanFeatureProbe(storeId);
    const failed = plan.rows.filter((r) => r.probeStatus === "fail");
    const warned = plan.rows.filter((r) => r.probeStatus === "warn");
    if (failed.length > 0) {
      findings.push({
        id: "hub-plan-fail",
        category: "payments",
        severity: "critical",
        label: `${failed.length} funcionalidade(s) do plano com falha`,
        detail: failed.map((r) => r.label).join(", "),
        panel: "admin",
        link: "/admin/plans",
      });
    }
    if (warned.length > 0) {
      findings.push({
        id: "hub-plan-warn",
        category: "payments",
        severity: "suggestion",
        label: `${warned.length} funcionalidade(s) com aviso no plano ${plan.tenantPlan}`,
        panel: "admin",
        link: "/admin/plans",
      });
    }
    if (failed.length === 0 && warned.length === 0) {
      findings.push({
        id: "hub-plan-ok",
        category: "payments",
        severity: "ok",
        label: `Plano ${plan.tenantPlan} — funcionalidades verificadas`,
        panel: "admin",
      });
    }
  } catch {
    /* ignore */
  }

  return findings;
}
