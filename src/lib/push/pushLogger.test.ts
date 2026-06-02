import { describe, expect, it } from "vitest";
import { describePushFailure } from "./pushLogger";
import { isValidVapidPublicKeyFormat, urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from "@/lib/vapidPublicKey";

describe("describePushFailure", () => {
  it("detects permission denied", () => {
    const out = describePushFailure(new Error("x"), "denied");
    expect(out.code).toBe("permission_denied");
  });

  it("detects VAPID InvalidAccessError", () => {
    const err = new DOMException("Invalid key", "InvalidAccessError");
    const out = describePushFailure(err, "granted");
    expect(out.code).toBe("vapid_invalid");
  });
});

describe("vapid public key", () => {
  it("validates app key format and decodes", () => {
    expect(isValidVapidPublicKeyFormat(VAPID_PUBLIC_KEY)).toBe(true);
    expect(urlBase64ToUint8Array(VAPID_PUBLIC_KEY).length).toBeGreaterThanOrEqual(65);
  });
});
