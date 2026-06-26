#!/usr/bin/env bash
# Alinha capacitor.config.json com a build 10 (funcionava) + site embutido no pacote.
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

const list = Array.isArray(cfg.packageClassList) ? cfg.packageClassList : [];
// Build 10: só plugins do Package.appstore.swift (sem Stripe/TcpSocket que não entram no IPA).
cfg.packageClassList = list.filter(
  (name) => name !== "StripeTerminalPlugin" && name !== "TcpSocketPlugin",
);

// Menu dentro do pacote — não depende do site ao abrir (build 30+ falhava com URL remota).
delete cfg.server;

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, "\t") + "\n");
console.log("✓ capacitor.config.json App Store: como build 10 + menu embutido");
console.log("  packageClassList:", cfg.packageClassList.join(", "));
NODE
