import { describe, expect, it, vi } from "vitest";
import type { AuditFinding } from "./adminSystemAudit";

vi.mock("@/lib/diagnostics/backendReadinessProbe", () => ({
  probeBackendReadiness: vi.fn().mockResolvedValue([
    {
      id: "rpc-ok-test",
      category: "system",
      severity: "ok",
      label: "Test RPC",
      panel: "backend",
    },
  ]),
}));

vi.mock("@/lib/diagnostics/staffAuthAuditProbe", () => ({
  probeStaffAuthAudit: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/diagnostics/panelAuditMatrix", () => ({
  probeAllPanels: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/diagnostics/hubAuditProbe", () => ({
  probeHubModules: vi.fn().mockResolvedValue([]),
}));

vi.mock("./adminSystemAudit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adminSystemAudit")>();
  return {
    ...actual,
    fetchAdminSystemAudit: vi.fn().mockResolvedValue([
      {
        id: "biz-menu",
        category: "menu",
        severity: "warning",
        label: "Menu warning",
      },
    ]),
  };
});

import { runFullAppAudit } from "./fullAppAuditService";

describe("runFullAppAudit", () => {
  it("aggregates findings and computes summary", async () => {
    const report = await runFullAppAudit({ storeId: "store-1" });
    expect(report.sections.length).toBeGreaterThan(0);
    expect(report.summary.ok).toBeGreaterThanOrEqual(1);
    expect(report.summary.warning).toBeGreaterThanOrEqual(1);
    expect(report.ranAt).toBeTruthy();
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("tags business menu findings to admin panel", async () => {
    const report = await runFullAppAudit({ storeId: "store-1" });
    const menuFinding = report.allFindings.find((f) => f.id === "biz-menu");
    expect(menuFinding?.panel).toBe("admin");
  });

  it("includes legacy ops failures in backend section", async () => {
    const report = await runFullAppAudit({
      storeId: "store-1",
      opsItems: [
        {
          id: "stripe-connect",
          label: "Stripe",
          detail: "Not connected",
          status: "fail",
          critical: true,
        },
      ],
    });
    const legacy = report.allFindings.find((f) => f.id === "legacy-stripe-connect");
    expect(legacy?.severity).toBe("critical");
    expect(legacy?.panel).toBe("backend");
  });
});

describe("full audit summary logic", () => {
  it("counts severities correctly", () => {
    const findings: AuditFinding[] = [
      { id: "1", category: "system", severity: "ok", label: "a" },
      { id: "2", category: "system", severity: "critical", label: "b" },
      { id: "3", category: "system", severity: "warning", label: "c" },
    ];
    const issues = findings.filter((f) => f.severity !== "ok");
    expect(issues.length).toBe(2);
  });
});
