import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/lib/diagnostics/rpcProbeUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/diagnostics/rpcProbeUtils")>();
  return {
    ...actual,
    probeEdgeFunctionReachable: vi.fn().mockResolvedValue({ reachable: true, status: 200 }),
  };
});

import { supabase } from "@/integrations/supabase/client";
import { probeBackendReadiness } from "./backendReadinessProbe";
import { probeEdgeFunctionReachable } from "@/lib/diagnostics/rpcProbeUtils";

describe("probeBackendReadiness", () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      error: { message: "permission denied" },
    } as never);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { audit_ready: true },
      error: null,
    } as never);
    vi.mocked(probeEdgeFunctionReachable).mockResolvedValue({ reachable: true, status: 200 });
  });

  it("flags missing staff password RPC as critical", async () => {
    vi.mocked(supabase.rpc).mockImplementation(((name: string) => {
      if (name === "manager_set_staff_password") {
        return Promise.resolve({
          error: { message: "PGRST202: Could not find the function" },
        } as never);
      }
      return Promise.resolve({ error: { message: "permission denied" } } as never);
    }) as never);

    const findings = await probeBackendReadiness("store-1");
    const missing = findings.find((f) => f.id === "rpc-missing-manager_set_staff_password");
    expect(missing?.severity).toBe("critical");
  });

  it("reports staff edge ready when audit_ping succeeds", async () => {
    const findings = await probeBackendReadiness("store-1");
    expect(findings.some((f) => f.id === "edge-staff-action-ok")).toBe(true);
  });

  it("flags old staff edge without audit_ready", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { ok: true },
      error: null,
    } as never);

    const findings = await probeBackendReadiness("store-1");
    expect(findings.some((f) => f.id === "edge-staff-action-old")).toBe(true);
  });
});
