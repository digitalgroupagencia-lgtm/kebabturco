#!/usr/bin/env bash
# Evita crash ao abrir: só plugins que existem no IPA App Store (como build 10).
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

// Só o que está em Package.appstore.swift — plugins a mais fazem abrir e fechar no iPhone.
cfg.packageClassList = [
  "KeepAwakePlugin",
  "AppPlugin",
  "PushNotificationsPlugin",
  "ScreenOrientationPlugin",
];

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
console.log("✓ capacitor.config.json App Store: kebabturco.net + plugins seguros");
console.log("  packageClassList:", cfg.packageClassList.join(", "));
NODE
