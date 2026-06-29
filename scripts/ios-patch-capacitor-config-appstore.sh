#!/usr/bin/env bash
# App Store / TestFlight: site remoto + plugins controlados para diagnosticar crash de arranque.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/ios/App/App/capacitor.config.json"

if [ ! -f "$CFG" ]; then
  echo "ERRO: falta $CFG — corra npx cap sync ios antes."
  exit 1
fi

CFG_PATH="$CFG" KEBAB_IOS_STARTUP_DIAGNOSTIC="${KEBAB_IOS_STARTUP_DIAGNOSTIC:-1}" node <<'NODE'
const fs = require("fs");
const cfgPath = process.env.CFG_PATH;
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const startupDiagnostic = process.env.KEBAB_IOS_STARTUP_DIAGNOSTIC !== "0";

const SAFE_PLUGINS = startupDiagnostic
  ? new Set(["AppPlugin"])
  : new Set([
      "KeepAwakePlugin",
      "AppPlugin",
      "PushNotificationsPlugin",
      "ScreenOrientationPlugin",
      "ApnsTokenBridgePlugin",
    ]);

const FORBIDDEN_PLUGINS = [
  "StripeTerminalPlugin",
  "TcpSocketPlugin",
  "GeolocationPlugin",
  "PreferencesPlugin",
  ...(startupDiagnostic ? ["PushNotificationsPlugin", "ApnsTokenBridgePlugin"] : []),
];

cfg.packageClassList = [...SAFE_PLUGINS];
if (startupDiagnostic && cfg.plugins) {
  delete cfg.plugins.PushNotifications;
}

for (const bad of FORBIDDEN_PLUGINS) {
  if (cfg.packageClassList.includes(bad)) {
    throw new Error(`plugin proibido no IPA: ${bad}`);
  }
}

// Build 10: iPhone abre kebabturco.net dentro da app (não menu embutido).
cfg.server = {
  url: "https://kebabturco.net",
  cleartext: true,
  androidScheme: "https",
  allowNavigation: [
    "192.168.*",
    "10.*",
    "172.16.*",
    "*.lovable.app",
    "*.lovableproject.com",
    "kebabturco.net",
    "*.kebabturco.net",
    "snaporder.digitalgroupsti.com",
  ],
};

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, "\t") + "\n");
console.log("✓ capacitor.config.json App Store: site remoto");
console.log("  startup diagnostic:", startupDiagnostic ? "ON" : "OFF");
console.log("  server.url:", cfg.server.url);
console.log("  packageClassList:", cfg.packageClassList.join(", "));
NODE
