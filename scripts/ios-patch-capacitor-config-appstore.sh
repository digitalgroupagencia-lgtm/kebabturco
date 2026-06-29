#!/usr/bin/env bash
# App Store / TestFlight: igual build 10 — site remoto + só plugins que existem no IPA.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/ios/App/App/capacitor.config.json"

if [ ! -f "$CFG" ]; then
  echo "ERRO: falta $CFG — corra npx cap sync ios antes."
  exit 1
fi

node <<'NODE'
const fs = require("fs");
const path = require("path");
const cfgPath = path.join(process.cwd(), "ios/App/App/capacitor.config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

const SAFE_PLUGINS = new Set([
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
];

if (Array.isArray(cfg.packageClassList)) {
  cfg.packageClassList = cfg.packageClassList.filter((name) => SAFE_PLUGINS.has(name));
} else {
  cfg.packageClassList = [...SAFE_PLUGINS];
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
console.log("✓ capacitor.config.json App Store: site remoto (build 10)");
console.log("  server.url:", cfg.server.url);
console.log("  packageClassList:", cfg.packageClassList.join(", "));
NODE
