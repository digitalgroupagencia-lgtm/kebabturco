import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createStaffMember } from "./createStaffMember";

const mockSignUp = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  })),
}));

describe("createStaffMember", () => {
  const input = {
    email: "entregador@teste.com",
    password: "Turco2051!",
    full_name: "ENTREGADOR TESTE",
    role: "delivery" as const,
    store_id: "store-1",
    tenant_id: "tenant-1",
    access_pin: "830242#",
    preferred_language: "es",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-new-1" } },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "profiles") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "add_team_member_to_store") {
        return Promise.resolve({ data: "role-1", error: null });
      }
      if (fn === "upsert_staff_access_pin" || fn === "upsert_staff_profile_by_manager") {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("usa fallback local quando a Edge Function falha com Failed to fetch", async () => {
    const result = await createStaffMember(input);

    expect(result.success).toBe(true);
    expect(result.user_id).toBe("user-new-1");
    expect(result.created_new_user).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "entregador@teste.com" }),
    );
  });

  it("usa fallback local quando a Edge Function responde 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not Found" }),
      }),
    );

    const result = await createStaffMember(input);

    expect(result.success).toBe(true);
    expect(mockSignUp).toHaveBeenCalled();
  });
});
