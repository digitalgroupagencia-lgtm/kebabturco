#!/usr/bin/env bash
# Audita um .ipa Kebab Turco — config embutida, perfil, plugins Capacitor.
# Uso: bash scripts/audit-ios-ipa.sh caminho/para/App.ipa
set -euo pipefail

IPA="${1:-}"
if [ -z "$IPA" ] || [ ! -f "$IPA" ]; then
  echo "Uso: bash scripts/audit-ios-ipa.sh <ficheiro.ipa>"
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

unzip -q "$IPA" -d "$WORK"
APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' -type d | head -1)"
if [ -z "$APP" ]; then
  echo "ERRO: Payload sem .app"
  exit 1
fi

PLIST="$APP/Info.plist"
CFG="$APP/capacitor.config.json"
PROV="$APP/embedded.mobileprovision"

echo "=== IPA: $(basename "$IPA") ==="
echo ""

if [ -f "$PLIST" ]; then
  echo "--- Info.plist ---"
  plutil -p "$PLIST" 2>/dev/null | grep -E 'CFBundleIdentifier|CFBundleShortVersionString|CFBundleVersion|UIRequiredDeviceCapabilities|UIBackgroundModes' || true
  echo ""
fi

if [ -f "$CFG" ]; then
  echo "--- capacitor.config.json ---"
  if command -v jq >/dev/null 2>&1; then
    echo "server.url: $(jq -r '.server.url // "—"' "$CFG")"
    echo "packageClassList:"
    jq -r '.packageClassList[]?' "$CFG" 2>/dev/null | sed 's/^/  · /'
    DIAG="$(jq -r '.ios.diagnosticBuild // empty' "$CFG")"
    [ -n "$DIAG" ] && echo "diagnosticBuild: $DIAG"
  else
    grep -E 'kebabturco|packageClassList|ApnsTokenBridge|PushNotifications|server' "$CFG" || cat "$CFG"
  fi
  echo ""
fi

if [ -f "$APP/public/version.json" ]; then
  echo "--- version.json (web embutido) ---"
  cat "$APP/public/version.json"
  echo ""
fi

if [ -f "$PROV" ]; then
  echo "--- Perfil embutido ---"
  security cms -D -i "$PROV" 2>/dev/null | plutil -p - 2>/dev/null | grep -E '"Name"|aps-environment|get-task-allow|application-identifier' || true
  echo ""
fi

echo "--- Binários (plugins / frameworks) ---"
find "$APP/Frameworks" -maxdepth 1 -name '*.framework' 2>/dev/null | xargs -I{} basename {} .framework | sort || echo "(sem Frameworks/)"
echo ""

if [ -f "$APP/App" ] || [ -f "$APP/$(basename "$APP" .app)" ]; then
  echo "--- Classes Capacitor no binário (heurística) ---"
  BIN="$APP/$(plutil -extract CFBundleExecutable raw "$PLIST" 2>/dev/null || echo "$(basename "$APP" .app)")"
  [ -f "$BIN" ] && strings "$BIN" 2>/dev/null | grep -E 'Plugin$|ApnsTokenBridge' | sort -u | head -20 || true
fi

echo ""
echo "=== Fim auditoria ==="
