import type { DiagnosticItem } from "@/features/ops/useOperationalDiagnostics";
import { probeBackendReadiness } from "@/lib/diagnostics/backendReadinessProbe";
import { probeHubModules } from "@/lib/diagnostics/hubAuditProbe";
import { probeAllPanels } from "@/lib/diagnostics/panelAuditMatrix";
import { probeStaffAuthAudit } from "@/lib/diagnostics/staffAuthAuditProbe";
import {
  fetchAdminSystemAudit,
  type AuditFinding,
  type AuditPanel,
  type AuditSeverity,
} from "@/services/adminSystemAudit";

export type FullAuditSummary = {
  critical: number;
  warning: number;
  suggestion: number;
  ok: number;
  totalIssues: number;
};

export type FullAuditSection = {
  id: AuditPanel;
  label: string;
  findings: AuditFinding[];
};

export type FullAuditReport = {
  summary: FullAuditSummary;
  sections: FullAuditSection[];
  allFindings: AuditFinding[];
  ranAt: string;
  durationMs: number;
};

const PANEL_LABELS: Record<AuditPanel, string> = {
  backend: "Servidor e base de dados",
  customer: "Cliente",
  restaurant: "Painel do restaurante",
  delivery: "Entregador",
  seller: "Vendedor",
  admin: "Administração",
};

const STORAGE_KEY = "kebabturco.fullAuditReport.v1";

function legacyOpsToFindings(items: DiagnosticItem[]): AuditFinding[] {
  return items
    .filter((i) => i.status !== "ok" && i.status !== "pending")
    .map((i) => {
      const severity: AuditSeverity =
        i.status === "fail" ? (i.critical ? "critical" : "warning") : "warning";
      const isPayment =
        i.id.startsWith("stripe-") ||
        i.id === "database" ||
        i.id.includes("payment") ||
        i.id.includes("webhook");
      return {
        id: `legacy-${i.id}`,
        category: isPayment ? "payments" : "system",
        severity,
        label: i.label,
        detail: i.detail,
        action: i.action,
        link: i.link ?? (isPayment ? "/admin/finance" : "/admin/diagnostics"),
        linkLabel: i.linkLabel,
        panel: "backend" as AuditPanel,
      };
    });
}

function summarize(findings: AuditFinding[]): FullAuditSummary {
  const issues = findings.filter((f) => f.severity !== "ok");
  return {
    critical: issues.filter((f) => f.severity === "critical").length,
    warning: issues.filter((f) => f.severity === "warning").length,
    suggestion: issues.filter((f) => f.severity === "suggestion").length,
    ok: findings.filter((f) => f.severity === "ok").length,
    totalIssues: issues.length,
  };
}

function assignPanel(f: AuditFinding, fallback: AuditPanel): AuditFinding {
  return f.panel ? f : { ...f, panel: fallback };
}

function groupByPanel(findings: AuditFinding[]): FullAuditSection[] {
  const map = new Map<AuditPanel, AuditFinding[]>();
  for (const f of findings) {
    const panel = f.panel ?? "backend";
    if (!map.has(panel)) map.set(panel, []);
    map.get(panel)!.push(f);
  }

  const order: AuditPanel[] = [
    "backend",
    "customer",
    "restaurant",
    "delivery",
    "seller",
    "admin",
  ];

  return order
    .filter((id) => map.has(id))
    .map((id) => ({
      id,
      label: PANEL_LABELS[id],
      findings: map.get(id)!.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    }));
}

function severityOrder(s: AuditSeverity): number {
  return { critical: 0, warning: 1, suggestion: 2, ok: 3 }[s];
}

export async function runFullAppAudit(params: {
  storeId: string | null;
  tenantId?: string | null;
  opsItems?: DiagnosticItem[];
  runOps?: () => Promise<void>;
}): Promise<FullAuditReport> {
  const started = Date.now();
  const { storeId, tenantId = null, opsItems = [], runOps } = params;

  if (runOps) await runOps();

  const [
    backend,
    staffAuth,
    panels,
    hub,
    business,
  ] = await Promise.all([
    probeBackendReadiness(storeId),
    probeStaffAuthAudit(storeId),
    probeAllPanels(storeId, tenantId),
    probeHubModules(storeId),
    fetchAdminSystemAudit(storeId),
  ]);

  const taggedBusiness = business.map((f) => {
    if (f.panel) return f;
    if (f.category === "menu") return { ...f, panel: "admin" as AuditPanel };
    if (f.category === "team") return { ...f, panel: "restaurant" as AuditPanel };
    if (f.category === "delivery") return { ...f, panel: "delivery" as AuditPanel };
    if (f.category === "orders" || f.category === "printing" || f.category === "tables")
      return { ...f, panel: "restaurant" as AuditPanel };
    if (f.category === "payments") return { ...f, panel: "admin" as AuditPanel };
    return { ...f, panel: "restaurant" as AuditPanel };
  });

  const allFindings: AuditFinding[] = [
    ...backend.map((f) => assignPanel(f, "backend")),
    ...staffAuth.map((f) => assignPanel(f, "restaurant")),
    ...panels,
    ...hub.map((f) => assignPanel(f, "admin")),
    ...taggedBusiness,
    ...legacyOpsToFindings(opsItems),
  ];

  const report: FullAuditReport = {
    summary: summarize(allFindings),
    sections: groupByPanel(allFindings),
    allFindings,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - started,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("kebabturco:full-audit-updated"));
    }
  } catch {
    /* ignore */
  }

  return report;
}

export function loadStoredFullAuditReport(): FullAuditReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FullAuditReport;
  } catch {
    return null;
  }
}

export function issuesOnly(report: FullAuditReport): AuditFinding[] {
  return report.allFindings.filter((f) => f.severity !== "ok");
}
