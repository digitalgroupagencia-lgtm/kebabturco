import { describe, expect, it, beforeEach } from "vitest";
import {
  clearLastStaffLogin,
  loadLastStaffLogin,
  saveLastStaffLogin,
} from "./staffLoginMemory";

describe("staffLoginMemory", () => {
  beforeEach(() => {
    clearLastStaffLogin();
  });

  it("saves and loads last staff email", () => {
    saveLastStaffLogin({ email: "Chef@Example.com", method: "password" });
    expect(loadLastStaffLogin()?.email).toBe("chef@example.com");
  });

  it("returns null when empty", () => {
    expect(loadLastStaffLogin()).toBeNull();
  });
});
