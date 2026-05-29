import { describe, expect, it, vi } from "vitest";
import { isRpcMissingError, probeRpc } from "./rpcProbeUtils";

describe("isRpcMissingError", () => {
  it("detects PGRST202 and schema cache messages", () => {
    expect(isRpcMissingError("PGRST202: Could not find the function public.foo")).toBe(true);
    expect(isRpcMissingError("Could not find the function public.bar in the schema cache")).toBe(
      true,
    );
    expect(isRpcMissingError("permission denied for function foo")).toBe(false);
    expect(isRpcMissingError(null)).toBe(false);
  });
});

describe("probeRpc", () => {
  it("returns missing when RPC does not exist", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "PGRST202: Could not find the function" },
    });
    const result = await probeRpc(rpc, "manager_set_staff_password", {});
    expect(result.status).toBe("missing");
  });

  it("returns present on permission error (RPC exists)", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "permission denied for function manager_set_staff_password" },
    });
    const result = await probeRpc(rpc, "manager_set_staff_password", {});
    expect(result.status).toBe("present");
  });

  it("returns present when call succeeds", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const result = await probeRpc(rpc, "list_store_drivers", { _store_id: "x" });
    expect(result.status).toBe("present");
  });
});
