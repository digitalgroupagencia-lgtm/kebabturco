import { describe, expect, it } from "vitest";
import { pickStaffStoreId } from "./staffStoreResolution";

describe("pickStaffStoreId", () => {
  const stores = [{ id: "store-a" }, { id: "store-b" }];
  const panelKey = (t: string) => `panel:${t}`;
  const adminKey = (t: string) => `admin:${t}`;

  it("falls back to first store when nothing saved", () => {
    expect(pickStaffStoreId(stores, "tenant-1", null, panelKey, adminKey)).toBe("store-a");
  });

  it("prefers saved panel store", () => {
    const tid = "tenant-1";
    localStorage.setItem(panelKey(tid), "store-b");
    expect(pickStaffStoreId(stores, tid, null, panelKey, adminKey)).toBe("store-b");
    localStorage.removeItem(panelKey(tid));
  });
});
