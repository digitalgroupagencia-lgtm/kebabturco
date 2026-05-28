import { describe, expect, it, vi, beforeEach } from "vitest";
import { nav } from "./navPaths.ts";

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { resolvePostLoginDestination } from "./authRedirect";

describe("resolvePostLoginDestination", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("honours next=/panel for admin_master instead of sending to general admin", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [{ role: "admin_master", tenant_id: null }],
          }),
      }),
    });

    const dest = await resolvePostLoginDestination("user-1", "/panel");
    expect(dest.path).toBe("/panel");
  });

  it("honours next=/admin/menu for admin_master when panel menu is requested", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [{ role: "admin_master", tenant_id: null }],
          }),
      }),
    });

    const dest = await resolvePostLoginDestination("user-1", nav.admin("menu"));
    expect(dest.path).toBe("/admin/menu");
  });

  it("defaults admin_master to general admin only when next is missing", async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [{ role: "admin_master", tenant_id: null }],
          }),
      }),
    });

    const dest = await resolvePostLoginDestination("user-1", null);
    expect(dest.path).toBe("/admin");
  });
});
