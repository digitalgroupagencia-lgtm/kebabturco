import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createStaffMember } from "./createStaffMember";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@/services/staffAuthRpc", () => ({
  setStaffPasswordViaRpc: vi.fn().mockResolvedValue(true),
  createStaffAuthUserViaRpc: vi.fn().mockResolvedValue(null),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
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
    preferred_language: "es",
  };

  beforeEach(() => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "user-new-1" } },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: "test" } },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
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
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: "role-1" }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "lookup_staff_user_by_email") {
        return Promise.resolve({ data: null, error: null });
      }
      if (fn === "add_team_member_to_store") {
        return Promise.resolve({ data: "role-1", error: null });
      }
      if (fn === "upsert_staff_profile_by_manager") {
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ error: null });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("cria membro com signUp e confirma login", async () => {
    const result = await createStaffMember(input);

    expect(result.success).toBe(true);
    expect(result.user_id).toBe("user-new-1");
    expect(result.created_new_user).toBe(true);
    expect(result.login_ready).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "entregador@teste.com",
        options: expect.objectContaining({
          data: expect.objectContaining({ staff_team: true }),
        }),
      }),
    );
  });
});
