#!/usr/bin/env bash
# Alinha capacitor.config.json com o que entra na build App Store / TestFlight.
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

// Só plugins nativos incluídos em Package.appstore.swift + ponte APNs no target App.
cfg.packageClassList = [
  "KeepAwakePlugin",
  "AppPlugin",
  "PushNotificationsPlugin",
  "ScreenOrientationPlugin",
  "ApnsTokenBridgePlugin",
];

// Site embutido no pacote — evita crash ao arrancar só com URL remota (iOS 26 / TestFlight).
delete cfg.server;

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, "\t") + "\n");
console.log("✓ capacitor.config.json App Store: plugins alinhados, site embutido no pacote");
NODE
