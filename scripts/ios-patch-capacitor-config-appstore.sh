#!/usr/bin/env bash
# App Store / TestFlight: plugins alinhados + menu embutido (como build 33/34 que abria).
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

cfg.packageClassList = [
  "KeepAwakePlugin",
  "AppPlugin",
  "PushNotificationsPlugin",
  "ScreenOrientationPlugin",
  "ApnsTokenBridgePlugin",
  "LiveActivityPlugin",
];

delete cfg.server;

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, "\t") + "\n");
console.log("✓ capacitor.config.json App Store: menu embutido + plugins seguros");
console.log("  packageClassList:", cfg.packageClassList.join(", "));
NODE
