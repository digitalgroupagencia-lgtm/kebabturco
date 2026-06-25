import { registerPlugin } from "@capacitor/core";
import type { ApnsTokenBridgePlugin } from "./definitions";

export const ApnsTokenBridge = registerPlugin<ApnsTokenBridgePlugin>("ApnsTokenBridge", {
  web: () => import("./web").then((m) => new m.ApnsTokenBridgeWeb()),
});

export type { ApnsBridgeDiagnostics, ApnsTokenBridgePlugin } from "./definitions";
